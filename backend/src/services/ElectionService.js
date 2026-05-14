const { ApiError } = require("../core/ApiError");
const mongoose = require("mongoose");
const { Election } = require("../models/Election");
const { ElectionCandidate } = require("../models/ElectionCandidate");
const { Vote } = require("../models/Vote");
const { Member } = require("../models/Member");
const { EcPost } = require("../models/EcPost");
const { policyRegistry } = require("../policies");
const { AuditService } = require("./AuditService");

class ElectionService {
  static async createElection(payload, actorId, requestId) {
    // Map the simple `phase` field to `currentPhase` and set phase-specific dates
    const electionData = {
      ...payload,
      currentPhase: payload.phase || 1,
    };

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

  static async getElection(electionId) {
    const election = await Election.findById(electionId);
    if (!election) throw new ApiError(404, "Election not found");
    return election;
  }

  static async listElections() {
    return Election.find({}).sort({ createdAt: -1 });
  }

  static async addCandidate(payload, actorId, requestId) {
    console.log('=== ADD CANDIDATE DEBUG ===');
    console.log('Payload:', JSON.stringify(payload, null, 2));
    
    const election = await Election.findById(payload.electionId);
    const member = await Member.findById(payload.memberId);
    
    console.log('Election found:', !!election);
    console.log('Member found:', !!member);
    
    if (!election || !member) throw new ApiError(404, "Election or member not found");
    
    console.log('Election currentPhase:', election.currentPhase);
    console.log('Election phase (old):', election.phase);
    console.log('Payload postId:', payload.postId);
    console.log('Member currentYear:', member.currentYear);
    
    // Get phase - handle both old and new schema, default to 1 if not set
    const electionPhase = election.currentPhase || election.phase || 1;
    console.log('Resolved election phase:', electionPhase);
    
    // Check membership status - handle both old and new schema
    const memberStatus = member.membershipStatus?.status || member.status || "Unknown";
    console.log('Resolved member status:', memberStatus);
    
    if (memberStatus !== "Active") {
      throw new ApiError(400, `Only active members can be candidates. Current status: ${memberStatus}`);
    }

    console.log('Checking phase constraints...');
    if (electionPhase === 1 && payload.postId) {
      console.log('ERROR: Phase 1 with postId');
      throw new ApiError(400, "Phase 1 (batch representative) candidates must not include postId");
    }

    if (electionPhase === 2 && !payload.postId) {
      console.log('ERROR: Phase 2 without postId');
      throw new ApiError(400, "Phase 2 (office-bearer) candidates must include postId");
    }

    console.log('Phase constraints passed');
    let post = null;
    if (payload.postId) {
      console.log('Looking up post:', payload.postId);
      post = await EcPost.findById(payload.postId);
      if (!post) throw new ApiError(404, "EC post not found");
      
      console.log('Evaluating policy for post:', post.title);
      const check = await policyRegistry.evaluate("ec.holdPost", {
        memberYear: member.currentYear,
        memberEcYears: payload.memberEcYears || 0,
        post,
      });
      console.log('Policy check result:', check);
      if (!check.allowed) throw new ApiError(400, check.reason || "Candidate ineligible");
    }

    console.log('Creating candidate record...');
    try {
      // Get member's batch for phase 1 candidates
      const batch = electionPhase === 1 ? member.batch.toString() : undefined;
      
      const candidate = await ElectionCandidate.create({
        electionId: payload.electionId,
        memberId: payload.memberId,
        phase: electionPhase, // Use resolved phase
        postId: payload.postId || null,
        batch: batch, // Required for phase 1
        status: "Submitted", // Valid enum value (not "Pending")
      });
      console.log('Candidate created:', candidate._id);

      await AuditService.log({
        actorId,
        action: "ELECTION_CANDIDATE_ADDED",
        resource: "ElectionCandidate",
        resourceId: candidate._id.toString(),
        requestId,
        metadata: { electionId: payload.electionId, postId: payload.postId || null },
      });

      console.log('Candidate created successfully');
      return candidate;
    } catch (error) {
      console.error('Error creating candidate:', error);
      throw error;
    }
  }

  static async listCandidates(electionId) {
    const election = await Election.findById(electionId).select("_id phase");
    if (!election) throw new ApiError(404, "Election not found");

    return ElectionCandidate.find({ electionId })
      .populate({ path: "memberId", select: "studentId batch currentYear status userId", populate: { path: "userId", select: "firstName lastName email" } })
      .populate("postId", "title code displayOrder")
      .sort({ createdAt: 1 });
  }

  static async castVote(payload, actorId, requestId) {
    const election = await Election.findById(payload.electionId);
    if (!election) throw new ApiError(404, "Election not found");
    
    console.log('=== CAST VOTE DEBUG ===');
    console.log('Election ID:', payload.electionId);
    console.log('Election status:', election.status);
    console.log('Election currentPhase:', election.currentPhase);
    
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

      const votesCast = await Vote.countDocuments({ electionId: payload.electionId, voterMemberId: voter._id });
      if (votesCast >= 5) {
        throw new ApiError(400, "Phase 1 allows a maximum of 5 votes per voter");
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
    const election = await Election.findById(electionId).select("_id phase");
    if (!election) throw new ApiError(404, "Election not found");

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

    console.log('=== UPDATE PHASE DEBUG ===');
    console.log('Election ID:', electionId);
    console.log('Election currentPhase (from DB):', election.currentPhase);
    console.log('Payload:', JSON.stringify(payload, null, 2));

    // Update phase if provided (do this BEFORE status mapping)
    if (typeof payload.phase === "number") {
      console.log('Updating phase from', election.currentPhase, 'to', payload.phase);
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
      
      console.log('=== STATUS TRANSITION DEBUG ===');
      console.log('Current status:', currentStatus);
      console.log('Requested status:', newStatus);
      console.log('Current phase:', currentPhase);
      console.log('Mapped status:', mappedStatus);
      
      // Validate state transitions - allow Phase 2 elections to skip Phase 1
      const validTransitions = {
        'Draft': ['Setup', 'Phase1_Active', 'Phase2_Active', 'Cancelled'], // Allow direct to Phase2
        'Setup': ['Phase1_Active', 'Phase2_Active', 'Cancelled'], // Allow direct to Phase2
        'Phase1_Active': ['Phase1_Completed', 'Cancelled'],
        'Phase1_Completed': ['Phase2_Active', 'Completed', 'Cancelled'],
        'Phase2_Active': ['Phase2_Completed', 'Cancelled'],
        'Phase2_Completed': ['Completed'],
        'Completed': [],
        'Cancelled': []
      };
      
      const allowedNext = validTransitions[currentStatus] || [];
      console.log('Allowed transitions:', allowedNext);
      
      if (!allowedNext.includes(mappedStatus) && currentStatus !== mappedStatus) {
        console.error('TRANSITION REJECTED:', currentStatus, '->', mappedStatus);
        throw new ApiError(400, `Cannot transition from ${currentStatus} to ${mappedStatus}. Allowed transitions: ${allowedNext.join(', ')}`);
      }
      
      console.log('TRANSITION ACCEPTED:', currentStatus, '->', mappedStatus);
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
    console.log('Election saved with status:', election.status, 'and phase:', election.currentPhase);

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

  static async publishResults(electionId, actorId, requestId) {
    const election = await Election.findById(electionId);
    if (!election) throw new ApiError(404, "Election not found");

    const results = await this.getResults(electionId);
    election.status = "Completed";
    election.finalResultsPublishedAt = new Date();
    election.finalResultsPublishedBy = actorId;
    await election.save();

    await AuditService.log({
      actorId,
      action: "ELECTION_RESULTS_PUBLISHED",
      resource: "Election",
      resourceId: election._id.toString(),
      requestId,
    });

    return { election, results };
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
}

module.exports = { ElectionService };
