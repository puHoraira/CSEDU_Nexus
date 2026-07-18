const { ApiError } = require("../core/ApiError");
const mongoose = require("mongoose");
const { Election } = require("../models/Election");
const { ElectionCandidate } = require("../models/ElectionCandidate");
const { Vote } = require("../models/Vote");
const { Member } = require("../models/Member");
const { EcPost } = require("../models/EcPost");
const { EcTerm } = require("../models/EcTerm");
const { EcAppointment } = require("../models/EcAppointment");
const { VoteRecording } = require("../models/VoteRecording");
const { policyRegistry } = require("../policies");
const { AuditService } = require("./AuditService");
const { VideoRecordingService } = require("./VideoRecordingService");
const { ElectionAutomationService } = require("./ElectionAutomationService");
const { GovernanceService } = require("./GovernanceService");
const { NotificationService } = require("./NotificationService");

class ElectionService {
  /**
   * Calculate EC experience years for a member
   * Based on their ecExperience array
   * 
   * Handles two scenarios:
   * 1. Automatic appointments with termId - count unique terms
   * 2. Manual entries without termId - calculate based on date ranges
   */
  static computeEcYears(member) {
    console.log('\n🚨🚨🚨 [ElectionService] computeEcYears CALLED 🚨🚨🚨');
    console.log('🔢 [ElectionService.computeEcYears] Starting calculation for member:', member.studentId);
    console.log('🔢 [ElectionService.computeEcYears] EC Experience array:', JSON.stringify(member.ecExperience, null, 2));
    
    const entries = member.ecExperience || [];
    console.log('🔢 [ElectionService.computeEcYears] Number of entries:', entries.length);
    
    if (entries.length === 0) {
      console.log('🔢 [ElectionService.computeEcYears] No entries found, returning 0');
      return 0;
    }
    
    // Collect all unique calendar years where member had EC experience
    const uniqueYears = new Set();
    
    for (const exp of entries) {
      console.log('🔢 [ElectionService.computeEcYears] Processing entry:', exp.postName);
      
      // Use startDate field (from Member schema) or startsOn (legacy)
      const startDate = exp.startDate || exp.startsOn;
      const endDate = exp.endDate || exp.endsOn || (exp.isCurrent ? new Date() : null);
      
      console.log('🔢 [ElectionService.computeEcYears]   startDate:', startDate);
      console.log('🔢 [ElectionService.computeEcYears]   endDate:', endDate);
      
      if (!startDate) {
        console.log('🔢 [ElectionService.computeEcYears]   ⚠️  No start date, skipping');
        continue;
      }
      
      const start = new Date(startDate);
      const end = endDate ? new Date(endDate) : new Date(); // If no end date, assume current
      
      // Add all years from start to end
      const startYear = start.getFullYear();
      const endYear = end.getFullYear();
      
      console.log(`🔢 [ElectionService.computeEcYears]   Years range: ${startYear} to ${endYear}`);
      
      for (let year = startYear; year <= endYear; year++) {
        uniqueYears.add(year);
        console.log('🔢 [ElectionService.computeEcYears]     Added year:', year);
      }
    }
    
    console.log('🔢 [ElectionService.computeEcYears] Unique years collected:', Array.from(uniqueYears).sort());
    console.log('🔢 [ElectionService.computeEcYears] Final result:', uniqueYears.size);
    
    // Return count of unique years (this represents years of experience)
    return uniqueYears.size;
  }

  static async createElection(payload, actorId, requestId) {
    const electionType = payload.electionType || "full";

    // Map the simple `phase` field to `currentPhase` and set phase-specific dates
    const electionData = {
      ...payload,
      electionType,
      targetPost: payload.targetPost || null,
      currentPhase: payload.phase || 1,
    };

    // For non-full elections, force phase 2 start
    if (electionType === "phase2_only" || electionType === "single_post") {
      electionData.currentPhase = 2;
      electionData.phase1 = { status: "Not_Started" };
      electionData.usePerBatchPhase1 = false;
    }

    // Also populate phase-specific voting dates from top-level startsOn/endsOn
    if (payload.startsOn && payload.endsOn) {
      if (electionData.currentPhase === 1) {
        electionData.phase1 = {
          ...electionData.phase1,
          votingStart: payload.startsOn,
          votingEnd: payload.endsOn,
        };
      } else {
        electionData.phase2 = {
          ...electionData.phase2,
          votingStart: payload.startsOn,
          votingEnd: payload.endsOn,
        };
      }
    }

    const item = await Election.create(electionData);
    await AuditService.log({
      actorId,
      action: "ELECTION_CREATED",
      resource: "Election",
      resourceId: item._id.toString(),
      requestId,
    });
    return item;
  }

  static async updateElection(electionId, payload, actorId, requestId) {
    const election = await Election.findById(electionId);
    if (!election) throw new ApiError(404, "Election not found");

    // Update allowed fields
    if (payload.name) election.name = payload.name;
    if (payload.termId) election.termId = payload.termId;
    
    // Update dates if provided
    if (payload.startsOn) {
      election.startsOn = new Date(payload.startsOn);
      // Also update phase1 dates
      if (election.phase1) {
        election.phase1.votingStart = new Date(payload.startsOn);
      } else {
        election.phase1 = { votingStart: new Date(payload.startsOn) };
      }
    }
    
    if (payload.endsOn) {
      election.endsOn = new Date(payload.endsOn);
      // Also update phase1 dates
      if (election.phase1) {
        election.phase1.votingEnd = new Date(payload.endsOn);
      } else if (!election.phase1) {
        election.phase1 = { votingEnd: new Date(payload.endsOn) };
      } else {
        election.phase1.votingEnd = new Date(payload.endsOn);
      }
    }

    await election.save();

    await AuditService.log({
      actorId,
      action: "ELECTION_UPDATED",
      resource: "Election",
      resourceId: election._id.toString(),
      requestId,
      metadata: { 
        updatedFields: Object.keys(payload),
      },
    });

    return election;
  }

  static async getElection(electionId) {
    const election = await Election.findById(electionId).populate('targetPost', 'title code');
    if (!election) throw new ApiError(404, "Election not found");
    // Lazily apply any due auto-transition so reads never show a stale window.
    await ElectionAutomationService.processElection(election).catch(() => {});
    return election;
  }

  static async listElections(requestingUserId = null) {
    // Apply any due auto-transitions before listing so statuses are fresh.
    await ElectionAutomationService.runAutomationCheck().catch(() => {});
    const elections = await Election.find({}).sort({ createdAt: -1 }).populate('targetPost', 'title code');
    
    if (requestingUserId) {
      const { Member } = require("../models/Member");
      const member = await Member.findOne({ userId: requestingUserId }).select('academicYearLevel');
      
      if (member) {
        return elections.filter(election => {
          const targetYears = election.targetYears || [];
          
          // No target years or includes All_Years - show to everyone
          if (targetYears.length === 0 || targetYears.includes("All_Years")) {
            return true;
          }
          
          // Check if user's year level is in target years
          return targetYears.includes(member.academicYearLevel);
        });
      }
    }
    
    // No user context - only show All_Years elections or elections without targetYears
    return elections.filter(election => {
      const targetYears = election.targetYears || [];
      return targetYears.length === 0 || targetYears.includes("All_Years");
    });
  }

  static async addCandidate(payload, actorId, requestId) {
    const election = await Election.findById(payload.electionId);
    const member = await Member.findById(payload.memberId);

    if (!election || !member) throw new ApiError(404, "Election or member not found");

    // Resolve phase (support both old `phase` and new `currentPhase`), default 1.
    const electionPhase = election.currentPhase || election.phase || 1;

    // --- Constitution eligibility gates (ARTICLE XV) ---
    // Active membership required.
    const memberStatus = member.membershipStatus?.status || member.status || "Unknown";
    if (memberStatus !== "Active") {
      throw new ApiError(400, `Only active members can be candidates. Current status: ${memberStatus}`);
    }

    // Candidates cannot have been impeached in any former committee (ARTICLE XV.1).
    const wasImpeached = (member.ecExperience || []).some(
      (e) => e.performanceRating === "Impeached" || e.status === "Impeached" || e.wasImpeached === true
    );
    if (wasImpeached) {
      throw new ApiError(400, "Impeached members are not eligible to contest (Constitution ARTICLE XV.1)");
    }

    // Graduating batch cannot contest.
    if (member.academicYearLevel === "Graduated") {
      throw new ApiError(400, "Graduated members cannot contest in the election");
    }

    // Phase-specific constraints.
    if (electionPhase === 1) {
      // Phase 1 = batch representative — postId not applicable.
      payload.postId = null;
    }

    if (electionPhase === 2 && !payload.postId) {
      throw new ApiError(400, "Phase 2 (office-bearer) candidates must include postId");
    }

    // Phase 2 candidates must be approved Phase 1 representatives (ARTICLE XIV.3.ii).
    // UNLESS this is a phase2_only or single_post election where Phase 1 is skipped.
    if (electionPhase === 2 && (election.electionType || "full") === "full") {
      const phase1Rep = await ElectionCandidate.findOne({
        electionId: payload.electionId,
        memberId: payload.memberId,
        phase: 1,
        status: "Approved",
      });
      const isWinner = phase1Rep && phase1Rep.votingResults && phase1Rep.votingResults.isWinner;
      if (!phase1Rep || !isWinner) {
        throw new ApiError(400, "Only elected Phase 1 batch representatives can contest office-bearer posts");
      }
    }

    // For single_post elections, enforce the targetPost constraint
    if ((election.electionType === "single_post") && payload.postId) {
      if (payload.postId.toString() !== election.targetPost?.toString()) {
        throw new ApiError(400, "This election only accepts candidates for the designated post");
      }
    }

    let post = null;
    if (payload.postId) {
      post = await EcPost.findById(payload.postId);
      if (!post) throw new ApiError(404, "EC post not found");

      // Per-post year + EC-experience eligibility (ARTICLE XIV.4 / XV.2).
      // Always calculate EC years from member data on backend (ignore frontend value)
      const memberEcYears = this.computeEcYears(member);
      const check = await policyRegistry.evaluate("ec.holdPost", {
        memberYear: member.currentYear,
        memberEcYears,
        post,
      });
      if (!check.allowed) throw new ApiError(400, check.reason || "Candidate ineligible for this post");
    }

    // Phase 1 candidates carry their batch so voting can be batch-scoped.
    const batch = electionPhase === 1 ? member.batch.toString() : undefined;

    const candidate = await ElectionCandidate.create({
      electionId: payload.electionId,
      memberId: payload.memberId,
      phase: electionPhase,
      postId: payload.postId || null,
      batch,
      status: "Submitted",
      eligibilityDetails: {
        cgpa: member.academicRecord?.currentCgpa,
        attendancePercentage: member.attendanceRecord?.overallAttendancePercentage,
        isGraduating: member.academicYearLevel === "Graduated",
      },
    });

    await AuditService.log({
      actorId,
      action: "ELECTION_CANDIDATE_ADDED",
      resource: "ElectionCandidate",
      resourceId: candidate._id.toString(),
      requestId,
      metadata: { electionId: payload.electionId, phase: electionPhase, postId: payload.postId || null },
    });

    return candidate;
  }

  static async listCandidates(electionId, options = {}) {
    const election = await Election.findById(electionId).select("_id phase currentPhase usePerBatchPhase1 phase1Batches");
    if (!election) throw new ApiError(404, "Election not found");

    const candidates = await ElectionCandidate.find({ electionId })
      .populate({ path: "memberId", select: "studentId batch currentYear status userId", populate: { path: "userId", select: "firstName lastName email avatarUrl" } })
      .populate("postId", "title code displayOrder")
      .sort({ createdAt: 1 });

    console.log(`[listCandidates] Election ${electionId}: currentPhase=${election.currentPhase}, phase=${election.phase}`);
    console.log(`[listCandidates] Total candidates found: ${candidates.length}`);
    console.log(`[listCandidates] Candidates phases:`, candidates.map(c => ({ id: c._id, phase: c.phase, post: c.postId?.title || 'no-post' })));

    // Voter-scoped ballot: in Phase 1, a voter may only see candidates from
    // their own batch (Constitution ARTICLE XIV — batch representative voting).
    // In Phase 2, voters only see Phase 2 candidates (office bearers).
    // Commissioners/managers omit scopeToVoter to see everyone.
    if (options.scopeToVoter && options.requestingUserId) {
      const phase = election.currentPhase || election.phase || 1;
      console.log(`[listCandidates] scopeToVoter=true, resolved phase=${phase}`);
      
      // Filter candidates by current phase
      const phaseCandidates = candidates.filter((c) => c.phase === phase);
      console.log(`[listCandidates] After phase filter: ${phaseCandidates.length} candidates for phase ${phase}`);
      
      if (phase === 1) {
        const voter = await Member.findOne({ userId: options.requestingUserId }).select("batch");
        if (voter?.batch == null) return []; // can't resolve batch → leak nothing
        const voterBatch = voter.batch.toString();

        // If per-batch sub-elections exist, only expose candidates when the
        // voter's own batch sub-election is currently Active.
        if (election.usePerBatchPhase1 && Array.isArray(election.phase1Batches) && election.phase1Batches.length > 0) {
          const sub = election.phase1Batches.find((b) => b.batch === voterBatch);
          if (!sub || sub.status !== "Active") return [];
        }

        return phaseCandidates.filter((c) => {
          const denorm = c.batch != null ? c.batch.toString() : null;
          const memberBatch = c.memberId?.batch != null ? c.memberId.batch.toString() : null;
          return denorm === voterBatch || memberBatch === voterBatch;
        });
      }
      
      // Phase 2 (or any other phase): return all candidates for that phase
      console.log(`[listCandidates] Returning ${phaseCandidates.length} Phase ${phase} candidates`);
      return phaseCandidates;
    }

    return candidates;
  }

  static async castVote(payload, actorId, requestId) {
    // --- Recording gate (optional — videoRecordingId may be absent in the
    // 30-second session flow where the recording uploads after the vote) ---
    let recording = null;
    if (payload.videoRecordingId) {
      recording = await VoteRecording.findById(payload.videoRecordingId);
      if (!recording) {
        throw new ApiError(403, "Invalid video recording reference");
      }
      if (recording.voteId !== null && recording.voteId !== undefined) {
        throw new ApiError(409, "This recording has already been used for a vote");
      }
    }
    // --- End recording gate ---

    const election = await Election.findById(payload.electionId);
    if (!election) throw new ApiError(404, "Election not found");

    const activeStatuses = ['Active', 'Phase1_Active', 'Phase2_Active'];
    if (!activeStatuses.includes(election.status)) {
      throw new ApiError(400, `Election is not active. Current status: ${election.status}`);
    }

    const now = new Date();
    // Only enforce time window if dates are set
    if (election.startsOn && election.endsOn) {
      if (now < election.startsOn || now > election.endsOn) {
        throw new ApiError(400, "Election is outside the active voting time window");
      }
    }

    const voter = payload.voterMemberId
      ? await Member.findById(payload.voterMemberId)
      : await Member.findOne({ userId: actorId });
    if (!voter) throw new ApiError(404, "Voter member not found");
    
    // Check membership status - handle both old and new schema
    const voterStatus = voter.membershipStatus?.status || voter.status || "Unknown";
    if (voterStatus !== "Active") {
      throw new ApiError(400, `Only active members can vote. Current status: ${voterStatus}`);
    }
    
    if (voter.userId.toString() !== actorId) {
      throw new ApiError(403, "You can only cast vote for your own member account");
    }

    // Verify recording ownership now that we have the resolved voter._id (Requirement 6.2–6.3)
    if (recording && recording.voterId.toString() !== voter._id.toString()) {
      throw new ApiError(403, "Invalid video recording reference");
    }

    const candidate = await ElectionCandidate.findById(payload.candidateId);
    if (!candidate || candidate.electionId.toString() !== payload.electionId) {
      throw new ApiError(400, "Candidate does not belong to the election");
    }
    if (candidate.status !== "Approved") {
      throw new ApiError(400, "Only approved candidates can receive votes");
    }

    const candidateMember = await Member.findById(candidate.memberId).select("batch");
    if (!candidateMember) throw new ApiError(404, "Candidate member record not found");

    const electionPhase = election.currentPhase || 1;

    if (electionPhase === 1) {
      if (candidate.postId) {
        throw new ApiError(400, "Phase 1 vote can only target representative candidates");
      }

      if (candidateMember.batch !== voter.batch) {
        throw new ApiError(400, "Phase 1 vote is restricted to candidates from your own batch");
      }

      // Per-batch sub-election gating: the voter's batch sub-election must be Active.
      if (election.usePerBatchPhase1 && Array.isArray(election.phase1Batches) && election.phase1Batches.length > 0) {
        const voterBatch = voter.batch != null ? voter.batch.toString() : null;
        const sub = election.phase1Batches.find((b) => b.batch === voterBatch);
        if (!sub) {
          throw new ApiError(400, "No active representative election for your batch");
        }
        if (sub.status !== "Active") {
          throw new ApiError(400, `Voting for Batch ${voterBatch} is currently ${sub.status.replace("_", " ")}`);
        }
        // Per-batch voting window.
        if (sub.votingStart && sub.votingEnd) {
          const nowB = new Date();
          if (nowB < new Date(sub.votingStart) || nowB > new Date(sub.votingEnd)) {
            throw new ApiError(400, `Batch ${voterBatch} voting is outside its time window`);
          }
        }
        // Per-batch vote cap.
        const maxVotes = sub.maxVotesPerVoter || 5;
        const votesCast = await Vote.countDocuments({ electionId: payload.electionId, voterMemberId: voter._id });
        if (votesCast >= maxVotes) {
          throw new ApiError(400, `You may cast at most ${maxVotes} votes in Phase 1`);
        }
      } else {
        const votesCast = await Vote.countDocuments({ electionId: payload.electionId, voterMemberId: voter._id });
        if (votesCast >= 5) {
          throw new ApiError(400, "Phase 1 allows a maximum of 5 votes per voter");
        }
      }
    }

    if (electionPhase === 2) {
      if (!candidate.postId) {
        throw new ApiError(400, "Phase 2 vote requires office-bearing candidates");
      }

      const existingVotes = await Vote.find({ electionId: payload.electionId, voterMemberId: voter._id }).populate("candidateId", "postId");
      const alreadyVotedForPost = existingVotes.some(
        (vote) => vote.candidateId && vote.candidateId.postId && vote.candidateId.postId.toString() === candidate.postId.toString()
      );
      if (alreadyVotedForPost) {
        throw new ApiError(400, "You have already voted for this post in Phase 2");
      }
    }

    const castAt = new Date();
    const crypto = require('crypto');
    const voteData = `${payload.electionId}-${voter._id}-${payload.candidateId}-${castAt.getTime()}`;
    const voteHash = crypto.createHash('sha256').update(voteData).digest('hex');

    const vote = await Vote.create({
      electionId: payload.electionId,
      voterMemberId: voter._id,
      candidateId: payload.candidateId,
      phase: electionPhase,
      postId: electionPhase === 2 ? candidate.postId : null,
      batch: electionPhase === 1 ? candidateMember.batch : undefined,
      castAt,
      voteHash,
    });

    // Backfill the voteId on the recording so it can't be reused (Requirement 6.5)
    await VideoRecordingService.backfillVoteId(payload.videoRecordingId, vote._id);

    await AuditService.log({
      actorId,
      action: "ELECTION_VOTE_CAST",
      resource: "Vote",
      resourceId: vote._id.toString(),
      requestId,
      metadata: { electionId: payload.electionId },
    });
    return vote;
  }

  static async getResults(electionId) {
    const election = await Election.findById(electionId).select("_id phase currentPhase status startsOn endsOn phase1 phase2 isArchived results finalResultsPublishedAt");
    if (!election) throw new ApiError(404, "Election not found");
    // Ensure the phase is closed/tallied if its window has ended before reading.
    await ElectionAutomationService.processElection(election).catch(() => {});

    const rows = await Vote.aggregate([
      { $match: { electionId: new mongoose.Types.ObjectId(electionId) } },
      { $group: { _id: "$candidateId", total: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]);

    const candidateIds = rows.map((row) => row._id);
    const candidates = await ElectionCandidate.find({ _id: { $in: candidateIds } })
      .populate({ path: "memberId", select: "studentId batch currentYear userId", populate: { path: "userId", select: "firstName lastName email" } })
      .populate("postId", "title code displayOrder");

    const candidateMap = new Map(candidates.map((candidate) => [candidate._id.toString(), candidate]));

    return rows.map((row) => {
      const candidate = candidateMap.get(row._id.toString());
      const user = candidate?.memberId?.userId;
      return {
        candidateId: row._id,
        total: row.total,
        candidateStatus: candidate?.status || "Unknown",
        memberId: candidate?.memberId?._id || null,
        candidateName: user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email : "Unknown",
        studentId: candidate?.memberId?.studentId || null,
        batch: candidate?.memberId?.batch || null,
        post: candidate?.postId ? { _id: candidate.postId._id, title: candidate.postId.title, code: candidate.postId.code } : null,
      };
    });
  }

  static async updatePhase(electionId, payload, actorId, requestId) {
    const election = await Election.findById(electionId);
    if (!election) throw new ApiError(404, "Election not found");

    // Update phase if provided (do this BEFORE status mapping)
    if (typeof payload.phase === "number") {
      election.currentPhase = payload.phase;
    }
    
    // Update status with proper state machine logic
    if (payload.status) {
      const currentStatus = election.status;
      const newStatus = payload.status;
      
      // IMPORTANT: Use the election's currentPhase (which may have just been updated above)
      // to determine the correct mapped status
      const currentPhase = election.currentPhase;
      
      // Map simple frontend statuses to backend model statuses based on current phase
      const statusMap = {
        'Draft': 'Draft',
        'Active': currentPhase === 1 ? 'Phase1_Active' : 'Phase2_Active',
        'Closed': currentPhase === 1 ? 'Phase1_Completed' : 'Completed'
      };
      
      // Handle phase 0 (unset) - use the phase from payload if available, otherwise default to Phase 1
      if (currentPhase === 0) {
        const targetPhase = payload.phase || 1;
        statusMap.Active = targetPhase === 1 ? 'Phase1_Active' : 'Phase2_Active';
        statusMap.Closed = targetPhase === 1 ? 'Phase1_Completed' : 'Completed';
        
        // Also update the election phase if it was 0
        if (payload.phase) {
          election.currentPhase = payload.phase;
        }
      }
      
      // Use mapped status or direct status if already in correct format
      const mappedStatus = statusMap[newStatus] || newStatus;
      
      // Validate state transitions - allow Phase 2 elections to skip Phase 1
      // Also allow backward transitions (reopening) for mistaken status changes
      let validTransitions;
      if ((election.electionType || "full") !== "full") {
        // Non-full elections skip Phase 1 states entirely
        validTransitions = {
          'Draft': ['Setup', 'Phase2_Active', 'Cancelled'],
          'Setup': ['Phase2_Active', 'Cancelled'],
          'Phase2_Active': ['Phase2_Completed', 'Cancelled'],
          'Phase2_Completed': ['Phase2_Active', 'Completed'],
          'Completed': ['Phase2_Active'],
          'Cancelled': []
        };
      } else {
        validTransitions = {
          'Draft': ['Setup', 'Phase1_Active', 'Phase2_Active', 'Cancelled'],
          'Setup': ['Phase1_Active', 'Phase2_Active', 'Cancelled'],
          'Phase1_Active': ['Phase1_Completed', 'Cancelled'],
          'Phase1_Completed': ['Phase1_Active', 'Phase2_Active', 'Completed', 'Cancelled'],
          'Phase2_Active': ['Phase2_Completed', 'Cancelled'],
          'Phase2_Completed': ['Phase2_Active', 'Completed'],
          'Completed': ['Phase2_Active', 'Phase1_Active'],
          'Cancelled': []
        };
      }
      
      const allowedNext = validTransitions[currentStatus] || [];
      
      if (!allowedNext.includes(mappedStatus) && currentStatus !== mappedStatus) {
        throw new ApiError(400, `Cannot transition from ${currentStatus} to ${mappedStatus}. Allowed transitions: ${allowedNext.join(', ')}`);
      }
      
      election.status = mappedStatus;
      
      // Update phase-specific status
      if (currentPhase === 1 && election.phase1) {
        if (mappedStatus === 'Phase1_Active') election.phase1.status = 'Voting_Active';
        if (mappedStatus === 'Phase1_Completed') election.phase1.status = 'Completed';
      }
      if (currentPhase === 2 && election.phase2) {
        if (mappedStatus === 'Phase2_Active') election.phase2.status = 'Voting_Active';
        if (mappedStatus === 'Phase2_Completed') election.phase2.status = 'Completed';
      }
    }
    
    await election.save();

    await AuditService.log({
      actorId,
      action: "ELECTION_STATUS_UPDATED",
      resource: "Election",
      resourceId: election._id.toString(),
      requestId,
      metadata: { 
        phase: election.currentPhase, 
        status: election.status,
        previousStatus: payload.status 
      },
    });

    return election;
  }

  static async validateCandidate(candidateId, action, reason, actorId, requestId) {
    const candidate = await ElectionCandidate.findById(candidateId);
    if (!candidate) throw new ApiError(404, "Candidate not found");

    candidate.status = action;
    candidate.rejectionReason = action === "Rejected" ? reason || "Rejected by commission" : "";
    await candidate.save();

    await AuditService.log({
      actorId,
      action: "ELECTION_CANDIDATE_VALIDATED",
      resource: "ElectionCandidate",
      resourceId: candidate._id.toString(),
      requestId,
      metadata: { action },
    });

    return candidate;
  }

  static async cancelCandidate(candidateId, reason, actorId, requestId) {
    return this.validateCandidate(candidateId, "Rejected", reason, actorId, requestId);
  }

  static async getResults(electionId) {
    const election = await Election.findById(electionId);
    if (!election) throw new ApiError(404, "Election not found");

    // If results are stored in election document, return those
    if (election.results) {
      const allResults = [];
      
      // Phase 1 results
      if (election.results.phase1 && Array.isArray(election.results.phase1)) {
        for (const result of election.results.phase1) {
          allResults.push({
            candidateId: result.candidateId,
            memberId: result.memberId,
            studentId: result.studentId,
            candidateName: result.name || result.studentId,
            batch: result.batch,
            total: result.votes || 0,
            candidateStatus: 'Approved',
            post: null, // Phase 1 has no post
          });
        }
      }
      
      // Phase 2 results
      if (election.results.phase2 && Array.isArray(election.results.phase2)) {
        for (const result of election.results.phase2) {
          allResults.push({
            candidateId: result.candidateId,
            memberId: result.memberId,
            studentId: result.studentId,
            candidateName: result.name || result.studentId,
            batch: result.batch,
            total: result.votes || 0,
            candidateStatus: 'Approved',
            post: result.postId ? {
              _id: result.postId,
              title: result.postTitle,
              code: result.postTitle?.toUpperCase().replace(/\s+/g, '_')
            } : null,
          });
        }
      }
      
      if (allResults.length > 0) {
        return allResults;
      }
    }

    // Fallback: Calculate results from votes
    const candidates = await ElectionCandidate.find({ electionId })
      .populate("memberId")
      .populate("postId");

    const votes = await Vote.find({ electionId });
    const voteCounts = {};
    votes.forEach((v) => {
      const k = v.candidateId.toString();
      voteCounts[k] = (voteCounts[k] || 0) + 1;
    });

    const results = candidates.map((c) => {
      const member = c.memberId;
      return {
        candidateId: c._id.toString(),
        memberId: member?._id?.toString(),
        studentId: member?.studentId,
        candidateName: member?.studentId || 'Unknown',
        batch: member?.batch,
        total: voteCounts[c._id.toString()] || 0,
        candidateStatus: c.status,
        post: c.postId ? {
          _id: c.postId._id,
          title: c.postId.title,
          code: c.postId.code
        } : null,
      };
    });

    return results.sort((a, b) => b.total - a.total);
  }

  static async publishResults(electionId, actorId, requestId, options = {}) {
    const autoCreateAppointments = options.autoCreateAppointments !== false; // default ON
    const election = await Election.findById(electionId);
    if (!election) throw new ApiError(404, "Election not found");

    const results = await this.getResults(electionId);
    const phase = election.currentPhase || 1;

    election.status = "Completed";
    election.finalResultsPublishedAt = new Date();
    election.finalResultsPublishedBy = actorId;
    await election.save();

    // --- Automation: auto-appoint winners to EC posts ---
    const createdAppointments = [];
    const appointmentErrors = [];
    if (autoCreateAppointments && election.termId) {
      try {
        const term = await EcTerm.findById(election.termId);
        const startsOn = term?.startsOn || new Date();

        if (phase === 2) {
          // Phase 2 winners → their contested post (one winner per post).
          const winnersByPost = new Map();
          for (const row of results) {
            if (!row.post?._id) continue;
            const key = row.post._id.toString();
            if (!winnersByPost.has(key)) winnersByPost.set(key, row); // rows are vote-desc sorted
          }
          for (const [postId, row] of winnersByPost.entries()) {
            try {
              if (!row.memberId) { appointmentErrors.push({ candidateId: row.candidateId, reason: "No member" }); continue; }
              const appt = await GovernanceService.appointMember(
                { termId: election.termId, postId, memberId: row.memberId, startsOn, source: "Election" },
                actorId, requestId
              );
              createdAppointments.push(appt);
            } catch (err) {
              appointmentErrors.push({ candidateId: row.candidateId, reason: err.message });
            }
          }
        } else {
          // Phase 1 winners → executive-member posts, round-robin over free posts.
          const execPosts = await EcPost.find({ code: /EXECUTIVE_MEMBER/i, isActive: true }).sort({ displayOrder: 1 });
          let idx = 0;
          // Top-5 per batch from stored results (fallback to vote-sorted rows).
          const p1 = election.results?.phase1Results || [];
          const winnerIds = p1.length
            ? p1.flatMap((b) => b.winners.map((w) => w.candidateId?.toString())).filter(Boolean)
            : results.slice(0, 5).map((r) => r.candidateId?.toString());

          for (const cid of winnerIds) {
            try {
              const candidate = await ElectionCandidate.findById(cid).populate("memberId");
              if (!candidate?.memberId) { appointmentErrors.push({ candidateId: cid, reason: "No member" }); continue; }
              // Find a free exec post in this term.
              let assigned = null;
              for (let i = 0; i < execPosts.length; i++) {
                const p = execPosts[(idx + i) % execPosts.length];
                const held = await EcAppointment.findOne({ termId: election.termId, postId: p._id, endsOn: null });
                if (!held) { assigned = p; idx = (idx + i + 1); break; }
              }
              if (!assigned) { appointmentErrors.push({ candidateId: cid, reason: "No free executive post" }); continue; }
              const appt = await GovernanceService.appointMember(
                { termId: election.termId, postId: assigned._id, memberId: candidate.memberId._id, startsOn, source: "Election" },
                actorId, requestId
              );
              createdAppointments.push(appt);
            } catch (err) {
              appointmentErrors.push({ candidateId: cid, reason: err.message });
            }
          }
        }
      } catch (err) {
        appointmentErrors.push({ reason: err.message });
      }
    }

    // --- Automation: notify members results are live ---
    await NotificationService.createForRoleNames(["General Member", "Alumni"], {
      title: `Results published — ${election.name}`,
      message: `Final results for ${election.name} are now available.`,
      category: "Election",
      actionUrl: `/dashboard/elections/${election._id}/results`,
      entityType: "Election",
      entityId: election._id.toString(),
    }).catch(() => {});

    await AuditService.log({
      actorId,
      action: "ELECTION_RESULTS_PUBLISHED",
      resource: "Election",
      resourceId: election._id.toString(),
      requestId,
      metadata: { phase, appointmentsCreated: createdAppointments.length, appointmentErrors: appointmentErrors.length },
    });

    return { election, results, createdAppointments, appointmentErrors };
  }

  static async getMyVotes(electionId, actorId) {
    const election = await Election.findById(electionId);
    if (!election) throw new ApiError(404, "Election not found");

    // Find the member record for this user
    const member = await Member.findOne({ userId: actorId });
    if (!member) throw new ApiError(404, "Member record not found");

    // Get all votes cast by this member in this election
    const votes = await Vote.find({
      electionId: new mongoose.Types.ObjectId(electionId),
      voterMemberId: member._id
    })
      .populate({
        path: "candidateId",
        select: "memberId postId phase batch status",
        populate: [
          {
            path: "memberId",
            select: "studentId batch currentYear userId",
            populate: {
              path: "userId",
              select: "firstName lastName email"
            }
          },
          {
            path: "postId",
            select: "title code displayOrder"
          }
        ]
      })
      .sort({ createdAt: -1 });

    return votes.map(vote => ({
      _id: vote._id.toString(),
      candidateId: vote.candidateId._id.toString(),
      createdAt: vote.createdAt,
      candidate: vote.candidateId ? {
        phase: vote.candidateId.phase,
        batch: vote.candidateId.batch,
        status: vote.candidateId.status,
        post: vote.candidateId.postId ? {
          _id: vote.candidateId.postId._id,
          title: vote.candidateId.postId.title,
          code: vote.candidateId.postId.code
        } : null,
        member: vote.candidateId.memberId ? {
          studentId: vote.candidateId.memberId.studentId,
          batch: vote.candidateId.memberId.batch,
          name: vote.candidateId.memberId.userId ? 
            `${vote.candidateId.memberId.userId.firstName} ${vote.candidateId.memberId.userId.lastName}`.trim() : 
            'Unknown'
        } : null
      } : null
    }));
  }

  /**
   * Self-nomination: allows students to apply as candidates
   * - Checks eligibility (active membership, CGPA, attendance, not impeached)
   * - Auto-fills member data from authenticated user
   * - Sets status to "Pending" (requires EC approval)
   * - Only for Phase 1 (batch representative) elections
   */
  static async selfNominate(electionId, actorUserId, requestId, payload = {}) {
    const election = await Election.findById(electionId).populate('targetPost', 'title');
    if (!election) throw new ApiError(404, "Election not found");

    const electionType = election.electionType || "full";
    const electionPhase = election.currentPhase || election.phase || 1;
    const isNonFull = electionType === "phase2_only" || electionType === "single_post";

    // Allow self-nomination in Phase 1 and Phase 2 for full elections
    // For non-full elections, allow during Draft/Setup/Phase2_Active
    const validStatuses = electionPhase === 1
      ? ['Draft', 'Setup', 'Phase1_Active']
      : electionPhase === 2
      ? ['Draft', 'Setup', 'Phase1_Completed', 'Phase2_Active']
      : [];
    
    if (!validStatuses.includes(election.status)) {
      throw new ApiError(400, "This election is not accepting nominations at this time");
    }

    // Determine candidate phase and post
    let candidatePhase = electionPhase; // Use current phase
    let candidatePostId = null;
    let candidateBatch;

    if (candidatePhase === 1) {
      // Phase 1: Batch representative
      candidateBatch = undefined; // Will be set from member.batch later
    } else if (candidatePhase === 2) {
      // Phase 2: Office bearer - must specify post
      if (electionType === "single_post") {
        candidatePostId = election.targetPost?._id || election.targetPost;
      } else {
        candidatePostId = payload?.postId;
        if (!candidatePostId) {
          throw new ApiError(400, "You must specify which EC post you are nominating for");
        }
      }
    }

    // Find member record for the authenticated user
    const member = await Member.findOne({ userId: actorUserId });
    if (!member) throw new ApiError(404, "Member record not found. You must be a registered member to apply");

    if (candidatePhase === 1) {
      candidateBatch = member.batch.toString();
    }

    // Check if already nominated (allow reapplication if previous was rejected)
    const existing = await ElectionCandidate.findOne({
      electionId,
      memberId: member._id,
      phase: candidatePhase,
    });
    if (existing) {
      if (existing.status === "Rejected") {
        await ElectionCandidate.findByIdAndDelete(existing._id);
      } else {
        throw new ApiError(409, `You have already applied for this election. Current status: ${existing.status}`);
      }
    }

    // --- Eligibility checks (same as addCandidate) ---

    // Active membership required
    const memberStatus = member.membershipStatus?.status || member.status || "Unknown";
    if (memberStatus !== "Active") {
      throw new ApiError(400, `Only active members can apply as candidates. Your current status: ${memberStatus}`);
    }

    // Cannot have been impeached
    const wasImpeached = (member.ecExperience || []).some(
      (e) => e.performanceRating === "Impeached" || e.status === "Impeached" || e.wasImpeached === true
    );
    if (wasImpeached) {
      throw new ApiError(400, "Members with impeachment history cannot contest elections (Constitution ARTICLE XV.1)");
    }

    // Graduating batch cannot contest
    if (member.academicYearLevel === "Graduated") {
      throw new ApiError(400, "Graduated members cannot contest in elections");
    }

    // Eligibility thresholds: CGPA >= 3.0, Attendance >= 75%
    const cgpa = member.academicRecord?.currentCgpa || 0;
    const attendance = member.attendanceRecord?.overallAttendancePercentage || 0;

    if (cgpa < 3.0) {
      throw new ApiError(400, `Minimum CGPA of 3.0 required. Your CGPA: ${cgpa.toFixed(2)}`);
    }

    if (attendance < 75) {
      throw new ApiError(400, `Minimum attendance of 75% required. Your attendance: ${attendance}%`);
    }

    // For Phase 2 candidates, validate post eligibility
    if (candidatePhase === 2 && candidatePostId) {
      const post = await EcPost.findById(candidatePostId);
      if (!post) throw new ApiError(404, "EC post not found");
      const memberEcYears = this.computeEcYears(member);
      const check = await policyRegistry.evaluate("ec.holdPost", {
        memberYear: member.currentYear,
        memberEcYears,
        post,
      });
      if (!check.allowed) throw new ApiError(400, check.reason || "You are not eligible for this post");
    }

    // Create candidate record with status "Submitted" (needs EC approval)
    const candidate = await ElectionCandidate.create({
      electionId,
      memberId: member._id,
      phase: candidatePhase,
      postId: candidatePostId || null,
      batch: candidateBatch || undefined,
      status: "Submitted",
      nominationType: "Self_Nomination",
      submittedAt: new Date(),
      eligibilityDetails: {
        cgpa,
        attendancePercentage: attendance,
        isGraduating: member.academicYearLevel === "Graduated",
      },
    });

    await AuditService.log({
      actorId: actorUserId,
      action: "ELECTION_SELF_NOMINATED",
      resource: "ElectionCandidate",
      resourceId: candidate._id.toString(),
      requestId,
      metadata: { electionId, phase: candidatePhase, batch: candidateBatch, postId: candidatePostId },
    });

    // Notify Election Commissioners
    await NotificationService.createForRoleNames(
      ["Election Commissioner", "Moderator"],
      {
        title: "New candidate application",
        message: `${member.userId?.firstName || 'A student'} (${member.studentId}) has applied as a candidate for ${election.name}`,
        category: "Elections",
        actionUrl: `/dashboard/elections/${electionId}/candidates`,
        entityType: "ElectionCandidate",
        entityId: candidate._id.toString(),
      }
    );

    return candidate;
  }

  static async getMyVotes(electionId, actorUserId) {
    const member = await Member.findOne({ userId: actorUserId }).select('_id');
    if (!member) return [];
    
    const votes = await Vote.find({ electionId, voterMemberId: member._id })
      .populate({ path: 'candidateId', select: 'postId phase', populate: { path: 'postId', select: 'title' } });
    
    return votes;
  }

  static async getVotingStats(electionId) {
    const election = await Election.findById(electionId);
    if (!election) throw new ApiError(404, "Election not found");

    // Count votes by phase
    const phase1Votes = await Vote.countDocuments({ electionId, phase: 1 });
    const phase2Votes = await Vote.countDocuments({ electionId, phase: 2 });

    // Count eligible voters (all active members)
    const eligibleVoters = await Member.countDocuments({ 
      'membershipStatus.status': 'Active' 
    });

    return {
      phase1: {
        totalVotes: phase1Votes,
        eligibleVoters,
        turnoutPercentage: eligibleVoters > 0 ? (phase1Votes / eligibleVoters) * 100 : 0,
      },
      phase2: {
        totalVotes: phase2Votes,
        eligibleVoters,
        turnoutPercentage: eligibleVoters > 0 ? (phase2Votes / eligibleVoters) * 100 : 0,
      },
    };
  }
}

module.exports = { ElectionService };
