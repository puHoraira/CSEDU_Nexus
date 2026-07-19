const { ApiError } = require("../core/ApiError");
const mongoose = require("mongoose");
const { Election } = require("../models/Election");
const { ElectionCandidate } = require("../models/ElectionCandidate");
const { ElectionCommission } = require("../models/ElectionCommission");
const { ElectionNomination } = require("../models/ElectionNomination");
const { Vote } = require("../models/Vote");
const { Member } = require("../models/Member");
const { User } = require("../models/User");
const { EcPost } = require("../models/EcPost");
const { EcTerm } = require("../models/EcTerm");
const { policyRegistry } = require("../policies");
const { AuditService } = require("./AuditService");
const { NotificationService } = require("./NotificationService");
const { AccessService } = require("./AccessService");
const { ElectionCommissionService } = require("./ElectionCommissionService");
const { GovernanceService } = require("./GovernanceService");

class EnhancedElectionService {
  
  // Election Management
  static async createElection(payload, actorId, requestId) {
    // Validate term
    const term = await EcTerm.findById(payload.termId);
    if (!term) {
      throw new ApiError(404, "EC Term not found");
    }

    // Check if there's already an active election for this term
    const existingElection = await Election.findOne({
      termId: payload.termId,
      status: { $in: ["Draft", "Setup", "Phase1_Active", "Phase2_Active"] }
    });

    if (existingElection) {
      throw new ApiError(409, "An active election already exists for this term");
    }

    const election = await Election.create({
      name: payload.name,
      description: payload.description || "",
      termId: payload.termId,
      status: "Draft",
      currentPhase: 0,
      config: {
        ...payload.config,
        eligibility: {
          minCgpa: payload.config?.eligibility?.minCgpa || 2.5,
          minAttendance: payload.config?.eligibility?.minAttendance || 75,
          maxDisciplinaryActions: payload.config?.eligibility?.maxDisciplinaryActions || 0,
          excludeGraduating: payload.config?.eligibility?.excludeGraduating || false
        }
      },
      phase1: {
        name: "Batch Representative Election",
        description: "Election for Executive Members (Posts 12+)",
        status: "Not_Started",
        maxVotesPerVoter: payload.phase1?.maxVotesPerVoter || 5,
        eligibleBatches: payload.phase1?.eligibleBatches || []
      },
      phase2: {
        name: "Office Bearer Election", 
        description: "Election for Executive Committee Posts 1-11",
        status: "Not_Started",
        eligibleVoters: payload.phase2?.eligibleVoters || "All_Members"
      }
    });

    await AuditService.log({
      actorId,
      action: "ELECTION_CREATED",
      resource: "Election",
      resourceId: election._id.toString(),
      requestId,
      metadata: { termId: payload.termId }
    });

    return election;
  }

  static async listElections(filters = {}) {
    const query = {};
    
    if (filters.status) {
      query.status = filters.status;
    }
    
    if (filters.termId) {
      query.termId = filters.termId;
    }
    
    if (filters.currentPhase !== undefined) {
      query.currentPhase = filters.currentPhase;
    }

    return Election.find(query)
      .populate("termId", "name startsOn endsOn status")
      .populate("commissionId", "status formedAt")
      .populate("supervisedBy", "firstName lastName email")
      .sort({ createdAt: -1 });
  }

  static async getElectionById(electionId) {
    const election = await Election.findById(electionId)
      .populate("termId", "name startsOn endsOn status")
      .populate("commissionId")
      .populate("supervisedBy", "firstName lastName email");

    if (!election) {
      throw new ApiError(404, "Election not found");
    }

    return election;
  }

  static async updateElection(electionId, payload, actorId, requestId) {
    const election = await Election.findById(electionId);
    if (!election) {
      throw new ApiError(404, "Election not found");
    }

    // Only allow updates if election is in Draft or Setup status
    if (!["Draft", "Setup"].includes(election.status)) {
      throw new ApiError(400, "Cannot update election once it has started");
    }

    // Update allowed fields
    const allowedUpdates = ["name", "description", "config", "phase1", "phase2"];
    allowedUpdates.forEach(field => {
      if (payload[field] !== undefined) {
        if (field === "config" || field === "phase1" || field === "phase2") {
          election[field] = { ...election[field], ...payload[field] };
        } else {
          election[field] = payload[field];
        }
      }
    });

    await election.save();

    await AuditService.log({
      actorId,
      action: "ELECTION_UPDATED",
      resource: "Election",
      resourceId: election._id.toString(),
      requestId,
      metadata: { updatedFields: Object.keys(payload) }
    });

    return election;
  }

  // Candidate Management
  static async submitCandidateApplication(payload, actorId, requestId) {
    const election = await Election.findById(payload.electionId);
    if (!election) {
      throw new ApiError(404, "Election not found");
    }

    // Check if candidate registration is open
    const now = new Date();
    if (payload.phase === 1) {
      if (election.phase1.status !== "Registration_Open") {
        throw new ApiError(400, "Phase 1 candidate registration is not currently open");
      }
      if (election.phase1.candidateRegistrationEnd && now > election.phase1.candidateRegistrationEnd) {
        throw new ApiError(400, "Phase 1 candidate registration deadline has passed");
      }
    } else if (payload.phase === 2) {
      if (election.phase2.status !== "Registration_Open") {
        throw new ApiError(400, "Phase 2 candidate registration is not currently open");
      }
      if (election.phase2.candidateRegistrationEnd && now > election.phase2.candidateRegistrationEnd) {
        throw new ApiError(400, "Phase 2 candidate registration deadline has passed");
      }
    }

    // If memberId is provided in payload (admin/EC adding candidate), use that
    // Otherwise, use the logged-in user's member record (self-nomination)
    console.log('\n🔥🔥🔥 [submitCandidateApplication] RAW PAYLOAD DEBUG 🔥🔥🔥');
    console.log('🔢 [submitCandidateApplication] payload.memberId:', payload.memberId);
    console.log('🔢 [submitCandidateApplication] payload.memberId type:', typeof payload.memberId);
    console.log('🔢 [submitCandidateApplication] payload.memberId truthy?:', !!payload.memberId);
    console.log('🔢 [submitCandidateApplication] full payload:', JSON.stringify(payload));
    console.log('🔥🔥🔥 END RAW PAYLOAD DEBUG 🔥🔥🔥\n');
    
    const targetMemberId = payload.memberId || null;
    
    let member;
    if (targetMemberId) {
      // Admin or EC is adding a candidate - use the specified member
      member = await Member.findById(targetMemberId).populate("userId", "firstName lastName email");
      if (!member) {
        throw new ApiError(404, "Specified member not found");
      }
    } else {
      // Self-nomination - use the logged-in user's member record
      member = await Member.findOne({ userId: actorId }).populate("userId", "firstName lastName email");
      if (!member) {
        throw new ApiError(404, "Your member record not found");
      }
    }

    console.log('\n🚨🚨🚨 [submitCandidateApplication] MEMBER DATA CHECK 🚨🚨🚨');
    console.log('🔢 [submitCandidateApplication] targetMemberId from payload:', targetMemberId);
    console.log('🔢 [submitCandidateApplication] actorId (logged-in user):', actorId);
    console.log('🔢 [submitCandidateApplication] member.studentId:', member.studentId);
    console.log('🔢 [submitCandidateApplication] member.currentYear:', member.currentYear);
    console.log('🔢 [submitCandidateApplication] member.currentYear type:', typeof member.currentYear);
    console.log('🔢 [submitCandidateApplication] member.academicYearLevel:', member.academicYearLevel);
    console.log('🔢 [submitCandidateApplication] member.batch:', member.batch);
    console.log('🔢 [submitCandidateApplication] member._id:', member._id);
    console.log('🚨🚨🚨 END MEMBER DATA CHECK 🚨🚨🚨\n');

    if (member.membershipStatus?.status !== "Active") {
      throw new ApiError(400, "Only active members can apply as candidates");
    }

    // Check if already applied for this election and phase
    // Use the actual member being registered, not the logged-in user
    const existingApplication = await ElectionCandidate.findOne({
      electionId: payload.electionId,
      memberId: member._id,  // This is now the correct member (either from payload or logged-in user)
      phase: payload.phase
    });

    if (existingApplication) {
      throw new ApiError(409, `${member.userId?.firstName || 'This member'} has already submitted an application for this phase`);
    }

    // Validate phase-specific requirements
    if (payload.phase === 1) {
      if (payload.postId) {
        throw new ApiError(400, "Phase 1 candidates should not specify a post");
      }
      if (!payload.batch) {
        payload.batch = member.batch;
      }
    }

    let targetPost = null;

    if (payload.phase === 2) {
      if (!payload.postId) {
        throw new ApiError(400, "Phase 2 candidates must specify a post");
      }
      
      targetPost = await EcPost.findById(payload.postId);
      if (!targetPost || !targetPost.isActive) {
        throw new ApiError(404, "Invalid or inactive post specified");
      }

      // Check EC experience eligibility
      const memberEcYears = this.computeEcYears(member);
      const memberYear = member.currentYear;

      console.log('\n🚨🚨🚨 [submitCandidateApplication PHASE 2 CHECK] 🚨🚨🚨');
      console.log('🔢 memberYear (from member.currentYear):', memberYear);
      console.log('🔢 memberYear type:', typeof memberYear);
      console.log('🔢 memberEcYears:', memberEcYears);
      console.log('🔢 targetPost.title:', targetPost.title);
      console.log('🔢 targetPost.minYear:', targetPost.minYear);
      console.log('🔢 targetPost.minEcYears:', targetPost.minEcYears);
      console.log('🔢 Check: memberYear < targetPost.minYear =', memberYear < targetPost.minYear);
      console.log('🚨🚨🚨 END PHASE 2 CHECK 🚨🚨🚨\n');

      // Validate minimum year requirement
      if (targetPost.minYear && memberYear < targetPost.minYear) {
        throw new ApiError(
          400, 
          `You are not eligible for ${targetPost.title}. This post requires ${targetPost.minYear}${this.getOrdinalSuffix(targetPost.minYear)} year, but you are in ${memberYear}${this.getOrdinalSuffix(memberYear)} year.`
        );
      }

      // Validate minimum EC experience requirement
      if (targetPost.minEcYears && memberEcYears < targetPost.minEcYears) {
        throw new ApiError(
          400, 
          `You are not eligible for ${targetPost.title}. This post requires ${targetPost.minEcYears} ${targetPost.minEcYears === 1 ? 'year' : 'years'} of EC experience, but you have ${memberEcYears} ${memberEcYears === 1 ? 'year' : 'years'}.`
        );
      }
    }

    const candidate = await ElectionCandidate.create({
      electionId: payload.electionId,
      memberId: member._id,
      phase: payload.phase,
      postId: payload.postId || null,
      batch: payload.batch || null,
      candidateStatement: payload.candidateStatement || "",
      campaignSlogan: payload.campaignSlogan || "",
      contactInfo: payload.contactInfo || {},
      nominationType: payload.nominationType || "Self_Nomination",
      status: "Submitted",
      submittedAt: new Date()
    });

    // Handle nominations if required
    if (payload.nominators && payload.nominators.length > 0) {
      for (const nominatorId of payload.nominators) {
        const nominator = await Member.findById(nominatorId);
        if (nominator && nominator.status === "Active") {
          await ElectionNomination.create({
            electionId: payload.electionId,
            candidateId: candidate._id,
            nominatorMemberId: nominatorId,
            nominationType: "Primary_Nominator",
            status: "Pending"
          });
        }
      }
    }

    // Notify election commission
    const commission = await ElectionCommission.findOne({ electionId: payload.electionId });
    if (commission) {
      const commissionMembers = [commission.chiefCommissioner, ...commission.commissioners.map(c => c.userId)];
      
      for (const memberId of commissionMembers) {
        await NotificationService.createForUser(memberId, {
          title: "New Candidate Application",
          message: `${member.userId?.firstName || "Member"} ${member.userId?.lastName || ""}`.trim() + ` has applied for ${payload.phase === 1 ? 'Executive Member' : (targetPost?.title || 'Office Bearer')}`,
          category: "Election",
          actionUrl: `/dashboard/elections/${payload.electionId}/candidates`,
          entityType: "ElectionCandidate",
          entityId: candidate._id.toString()
        });
      }
    }

    await AuditService.log({
      actorId,
      action: "ELECTION_CANDIDATE_APPLICATION_SUBMITTED",
      resource: "ElectionCandidate",
      resourceId: candidate._id.toString(),
      requestId,
      metadata: { 
        electionId: payload.electionId,
        phase: payload.phase,
        postId: payload.postId
      }
    });

    return candidate;
  }

  static async listCandidates(electionId, filters = {}) {
    const election = await Election.findById(electionId);
    if (!election) {
      throw new ApiError(404, "Election not found");
    }

    const query = { electionId };
    
    if (filters.phase) {
      query.phase = filters.phase;
    }
    
    if (filters.status) {
      query.status = filters.status;
    }
    
    if (filters.postId) {
      query.postId = filters.postId;
    }
    
    if (filters.batch) {
      query.batch = filters.batch;
    }

    return ElectionCandidate.find(query)
      .populate({
        path: "memberId",
        select: "studentId batch currentYear status userId",
        populate: {
          path: "userId",
          select: "firstName lastName email"
        }
      })
      .populate("postId", "title code displayOrder minYear minEcYears")
      .populate("reviewedBy", "firstName lastName")
      .sort({ phase: 1, "postId.displayOrder": 1, createdAt: 1 });
  }

  static async getCandidateById(candidateId) {
    const candidate = await ElectionCandidate.findById(candidateId)
      .populate({
        path: "memberId",
        populate: {
          path: "userId",
          select: "firstName lastName email"
        }
      })
      .populate("postId", "title code displayOrder")
      .populate("electionId", "name status currentPhase")
      .populate("reviewedBy", "firstName lastName");

    if (!candidate) {
      throw new ApiError(404, "Candidate not found");
    }

    return candidate;
  }

  // Voting System
  static async castVote(payload, actorId, requestId) {
    const election = await Election.findById(payload.electionId);
    if (!election) {
      throw new ApiError(404, "Election not found");
    }

    // Check if voting is active for the specified phase
    const now = new Date();
    if (payload.phase === 1) {
      if (election.phase1.status !== "Voting_Active") {
        throw new ApiError(400, "Phase 1 voting is not currently active");
      }
      if (election.phase1.votingEnd && now > election.phase1.votingEnd) {
        throw new ApiError(400, "Phase 1 voting period has ended");
      }
    } else if (payload.phase === 2) {
      if (election.phase2.status !== "Voting_Active") {
        throw new ApiError(400, "Phase 2 voting is not currently active");
      }
      if (election.phase2.votingEnd && now > election.phase2.votingEnd) {
        throw new ApiError(400, "Phase 2 voting period has ended");
      }
    }

    const voter = await Member.findOne({ userId: actorId });
    if (!voter) {
      throw new ApiError(404, "Voter member record not found");
    }

    if (voter.status !== "Active") {
      throw new ApiError(400, "Only active members can vote");
    }

    // Validate candidate
    const candidate = await ElectionCandidate.findById(payload.candidateId);
    if (!candidate || candidate.electionId.toString() !== payload.electionId) {
      throw new ApiError(400, "Invalid candidate for this election");
    }

    if (candidate.status !== "Approved") {
      throw new ApiError(400, "Can only vote for approved candidates");
    }

    if (candidate.phase !== payload.phase) {
      throw new ApiError(400, "Candidate phase does not match voting phase");
    }

    // Phase-specific validation
    if (payload.phase === 1) {
      // Check batch eligibility
      if (candidate.batch !== voter.batch) {
        throw new ApiError(400, "Phase 1 voting is restricted to candidates from your own batch");
      }

      // Check vote limit
      const existingVotes = await Vote.countDocuments({
        electionId: payload.electionId,
        voterMemberId: voter._id,
        phase: 1,
        isValid: true
      });

      if (existingVotes >= election.phase1.maxVotesPerVoter) {
        throw new ApiError(400, `Phase 1 allows maximum ${election.phase1.maxVotesPerVoter} votes per voter`);
      }

      // Check if already voted for this candidate
      const duplicateVote = await Vote.findOne({
        electionId: payload.electionId,
        voterMemberId: voter._id,
        candidateId: payload.candidateId,
        phase: 1,
        isValid: true
      });

      if (duplicateVote) {
        throw new ApiError(400, "You have already voted for this candidate");
      }

    } else if (payload.phase === 2) {
      // Check if already voted for this post
      const existingVoteForPost = await Vote.findOne({
        electionId: payload.electionId,
        voterMemberId: voter._id,
        postId: candidate.postId,
        phase: 2,
        isValid: true
      });

      if (existingVoteForPost) {
        throw new ApiError(400, "You have already voted for this post");
      }
    }

    // Create vote
    const vote = await Vote.create({
      electionId: payload.electionId,
      voterMemberId: voter._id,
      candidateId: payload.candidateId,
      phase: payload.phase,
      postId: candidate.postId,
      batch: candidate.batch,
      voteType: payload.voteType || "Regular",
      voterVerified: true,
      verificationMethod: payload.verificationMethod || "Student_ID",
      ipAddress: payload.ipAddress,
      userAgent: payload.userAgent
    });

    await AuditService.log({
      actorId,
      action: "ELECTION_VOTE_CAST",
      resource: "Vote",
      resourceId: vote._id.toString(),
      requestId,
      metadata: { 
        electionId: payload.electionId,
        phase: payload.phase,
        postId: candidate.postId?.toString(),
        batch: candidate.batch
      }
    });

    return { success: true, voteId: vote._id };
  }

  static async getVotingStatus(electionId, actorId) {
    const election = await Election.findById(electionId);
    if (!election) {
      throw new ApiError(404, "Election not found");
    }

    const voter = await Member.findOne({ userId: actorId });
    if (!voter) {
      throw new ApiError(404, "Voter member record not found");
    }

    // Get voting history
    const votes = await Vote.find({
      electionId,
      voterMemberId: voter._id,
      isValid: true
    }).populate({
      path: "candidateId",
      populate: [
        {
          path: "memberId",
          select: "userId",
          populate: {
            path: "userId",
            select: "firstName lastName"
          }
        },
        {
          path: "postId",
          select: "title code"
        }
      ]
    });

    // Calculate remaining votes
    const phase1Votes = votes.filter(v => v.phase === 1).length;
    const phase2Votes = votes.filter(v => v.phase === 2);
    
    const remainingPhase1Votes = Math.max(0, election.phase1.maxVotesPerVoter - phase1Votes);
    
    // Get posts already voted for in phase 2
    const votedPosts = phase2Votes.map(v => v.postId?.toString()).filter(Boolean);

    return {
      election: {
        _id: election._id,
        name: election.name,
        currentPhase: election.currentPhase,
        status: election.status,
        phase1Status: election.phase1.status,
        phase2Status: election.phase2.status
      },
      voter: {
        batch: voter.batch,
        isEligible: voter.status === "Active"
      },
      votingHistory: {
        phase1Votes: phase1Votes,
        phase2Votes: phase2Votes.length,
        remainingPhase1Votes,
        votedPosts,
        totalVotes: votes.length
      },
      votes: votes.map(vote => ({
        _id: vote._id,
        phase: vote.phase,
        candidateName: vote.candidateId?.memberId?.userId ? 
          `${vote.candidateId.memberId.userId.firstName} ${vote.candidateId.memberId.userId.lastName}` : 
          "Unknown",
        postTitle: vote.candidateId?.postId?.title || null,
        batch: vote.batch,
        castAt: vote.castAt
      }))
    };
  }

  // Results and Analytics
  static async getResults(electionId, phase = null) {
    const election = await Election.findById(electionId);
    if (!election) {
      throw new ApiError(404, "Election not found");
    }

    if (phase) {
      return ElectionCommissionService.calculateResults(electionId, phase);
    } else {
      const [phase1Results, phase2Results] = await Promise.all([
        ElectionCommissionService.calculateResults(electionId, 1),
        ElectionCommissionService.calculateResults(electionId, 2)
      ]);

      return {
        election,
        phase1Results,
        phase2Results,
        overallStats: await this.getElectionStatistics(electionId)
      };
    }
  }

  static async getElectionStatistics(electionId) {
    const [
      totalCandidates,
      totalVotes,
      uniqueVoters,
      eligibleVoters
    ] = await Promise.all([
      ElectionCandidate.countDocuments({ electionId, status: "Approved" }),
      Vote.countDocuments({ electionId, isValid: true }),
      Vote.distinct("voterMemberId", { electionId, isValid: true }),
      Member.countDocuments({ "membershipStatus.status": "Active" })
    ]);

    const voterTurnoutPercentage = eligibleVoters > 0 ? 
      (uniqueVoters.length / eligibleVoters * 100) : 0;

    return {
      totalEligibleVoters: eligibleVoters,
      totalVotesCast: totalVotes,
      uniqueVoters: uniqueVoters.length,
      voterTurnoutPercentage: Math.round(voterTurnoutPercentage * 100) / 100,
      totalCandidates,
      totalPosts: await EcPost.countDocuments({ isActive: true })
    };
  }

  /**
   * Calculate EC experience years for a member
   * Based on their ecExperience array
   * 
   * Handles two scenarios:
   * 1. Automatic appointments with termId - count unique terms
   * 2. Manual entries without termId - calculate based on date ranges
   */
  static computeEcYears(member) {
    console.log('\n🚨🚨🚨 computeEcYears CALLED 🚨🚨🚨');
    console.log('🔢 [computeEcYears] Starting calculation for member:', member.studentId);
    console.log('🔢 [computeEcYears] EC Experience array:', JSON.stringify(member.ecExperience, null, 2));
    
    const entries = member.ecExperience || [];
    console.log('🔢 [computeEcYears] Number of entries:', entries.length);
    
    if (entries.length === 0) {
      console.log('🔢 [computeEcYears] No entries found, returning 0');
      return 0;
    }
    
    // Collect all unique calendar years where member had EC experience
    const uniqueYears = new Set();
    
    for (const exp of entries) {
      console.log('🔢 [computeEcYears] Processing entry:', exp.postName);
      
      // Use startDate field (from Member schema) or startsOn (legacy)
      const startDate = exp.startDate || exp.startsOn;
      const endDate = exp.endDate || exp.endsOn || (exp.isCurrent ? new Date() : null);
      
      console.log('🔢 [computeEcYears]   startDate:', startDate);
      console.log('🔢 [computeEcYears]   endDate:', endDate);
      
      if (!startDate) {
        console.log('🔢 [computeEcYears]   ⚠️  No start date, skipping');
        continue;
      }
      
      const start = new Date(startDate);
      const end = endDate ? new Date(endDate) : new Date(); // If no end date, assume current
      
      // Add all years from start to end
      const startYear = start.getFullYear();
      const endYear = end.getFullYear();
      
      console.log(`🔢 [computeEcYears]   Years range: ${startYear} to ${endYear}`);
      
      for (let year = startYear; year <= endYear; year++) {
        uniqueYears.add(year);
        console.log('🔢 [computeEcYears]     Added year:', year);
      }
    }
    
    console.log('🔢 [computeEcYears] Unique years collected:', Array.from(uniqueYears).sort());
    console.log('🔢 [computeEcYears] Final result:', uniqueYears.size);
    
    // Return count of unique years (this represents years of experience)
    return uniqueYears.size;
  }

  /**
   * Get eligible Phase 2 posts for a member based on their EC experience and current year
   * Returns posts with eligibility status
   */
  static async getEligiblePostsForMember(memberId, electionId) {
    console.log('\n\n🚨🚨🚨 [getEligiblePostsForMember] METHOD CALLED - TIMESTAMP:', new Date().toISOString(), '🚨🚨🚨');
    console.log('🔍 🔍 🔍 [getEligiblePostsForMember] Called with:', { memberId, electionId });
    
    // FORCE ERROR TO TEST IF THIS CODE IS RUNNING
    if (memberId === '6a40ef0f9f9477fc185c9e47') {
      console.error('🔴🔴🔴 TEST MEMBER DETECTED! EC calculation will be traced 🔴🔴🔴');
    }
    
    const member = await require('../models/Member').Member.findById(memberId);
    if (!member) {
      console.error('❌ [getEligiblePostsForMember] Member not found:', memberId);
      throw new ApiError(404, "Member not found");
    }

    console.log('✅ [getEligiblePostsForMember] Member found:', {
      _id: member._id,
      studentId: member.studentId,
      currentYear: member.currentYear,
      ecExperienceCount: member.ecExperience?.length || 0,
      ecExperience: member.ecExperience
    });

    const election = await Election.findById(electionId);
    if (!election) {
      console.error('❌ [getEligiblePostsForMember] Election not found:', electionId);
      throw new ApiError(404, "Election not found");
    }

    // Get all active EC posts (excluding Executive Members)
    const posts = await require('../models/EcPost').EcPost.find({ 
      isActive: true, 
      code: { $not: /EXECUTIVE_MEMBER/i } 
    }).sort({ displayOrder: 1 });

    console.log('📋 [getEligiblePostsForMember] Found posts:', posts.length);

    // Calculate member's EC experience
    const memberEcYears = this.computeEcYears(member);
    const memberYear = member.currentYear;

    console.log('📊 [getEligiblePostsForMember] Calculated:', {
      memberYear,
      memberEcYears,
      ecExperienceEntries: member.ecExperience?.length || 0
    });
    
    console.log('⚠️ CRITICAL DEBUG - memberEcYears value RIGHT AFTER computeEcYears:', memberEcYears);
    console.log('⚠️ CRITICAL DEBUG - memberEcYears type:', typeof memberEcYears);
    console.log('⚠️ CRITICAL DEBUG - is it 0?', memberEcYears === 0);

    // Check eligibility for each post
    const eligibilityResults = posts.map(post => {
      const meetsYearRequirement = memberYear >= (post.minYear || 1);
      const meetsEcExperience = memberEcYears >= (post.minEcYears || 0);
      const isEligible = meetsYearRequirement && meetsEcExperience;

      let reason = null;
      if (!meetsYearRequirement) {
        reason = `Requires ${post.minYear || 1}${this.getOrdinalSuffix(post.minYear || 1)} year, you are in ${memberYear}${this.getOrdinalSuffix(memberYear)} year`;
      } else if (!meetsEcExperience) {
        reason = `Requires ${post.minEcYears} ${post.minEcYears === 1 ? 'year' : 'years'} of EC experience, you have ${memberEcYears}`;
      }

      console.log(`  📌 Post "${post.title}":`, {
        minYear: post.minYear,
        minEcYears: post.minEcYears,
        meetsYearRequirement,
        meetsEcExperience,
        isEligible,
        reason
      });

      return {
        post: {
          _id: post._id,
          code: post.code,
          title: post.title,
          minYear: post.minYear,
          minEcYears: post.minEcYears,
          displayOrder: post.displayOrder
        },
        isEligible,
        reason,
        memberYear,
        memberEcYears
      };
    });

    const result = {
      member: {
        _id: member._id,
        studentId: member.studentId,
        currentYear: memberYear,
        ecYears: memberEcYears,
        ecExperience: member.ecExperience  // Include full ecExperience array for debugging
      },
      eligibility: eligibilityResults,
      _debug: {
        memberEcYearsCalculated: memberEcYears,
        memberEcYearsType: typeof memberEcYears,
        timestamp: new Date().toISOString(),
        ecExperienceCount: member.ecExperience?.length || 0
      }
    };

    console.log('✅ [getEligiblePostsForMember] FINAL CHECK - memberEcYears value:', memberEcYears);
    console.log('✅ [getEligiblePostsForMember] FINAL CHECK - result.member.ecYears:', result.member.ecYears);
    console.log('✅ [getEligiblePostsForMember] Returning result:', JSON.stringify({
      memberEcYears,
      memberYear,
      eligiblePostsCount: eligibilityResults.filter(e => e.isEligible).length,
      totalPosts: eligibilityResults.length,
      fullResult: result
    }, null, 2));

    return result;
  }

  /**
   * Helper to get ordinal suffix (1st, 2nd, 3rd, etc.)
   */
  static getOrdinalSuffix(num) {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
  }

  static async publishResults(electionId, phase, actorId, requestId, autoCreateAppointments = false) {
    const election = await Election.findById(electionId);
    if (!election) {
      throw new ApiError(404, "Election not found");
    }

    // Fetch roles from database in real-time instead of relying on JWT
    const roleNames = await AccessService.getUserRoleNames(actorId);
    const postNames = await AccessService.getEcPostNames(actorId, null);
    const userRoles = [...new Set([...roleNames, ...postNames])];
    
    const hasPrivilegedAccess = userRoles.includes("Moderator") || 
                                userRoles.includes("Election Commissioner") ||
                                userRoles.includes("Chief Patron") || 
                                userRoles.includes("Chairman");

    // Check authorization
    let commission = null;
    if (election.commissionId) {
      commission = await ElectionCommission.findById(election.commissionId);
      
      if (commission && !hasPrivilegedAccess) {
        // Regular users must be commission members
        const isCommissionMember = commission.chiefCommissioner.toString() === actorId ||
                                   commission.commissioners.some(c => c.userId.toString() === actorId);

        if (!isCommissionMember) {
          throw new ApiError(403, "Only commission members, election commissioners, or moderators can publish results");
        }
      }
    } else {
      // No commission exists - only allow privileged users
      if (!hasPrivilegedAccess) {
        throw new ApiError(403, "Election commission not found. Only moderators and election commissioners can publish results without a commission.");
      }
    }

    // Calculate and store results
    const results = await ElectionCommissionService.calculateResults(electionId, phase);

    if (phase === 1) {
      election.phase1.resultsPublishedAt = new Date();
      election.phase1.status = "Completed";
      election.results.phase1Results = results;
    } else if (phase === 2) {
      election.phase2.resultsPublishedAt = new Date();
      election.phase2.status = "Completed";
      election.results.phase2Results = results;
      
      // If both phases are complete, mark election as completed
      if (election.phase1.status === "Completed") {
        election.status = "Completed";
        election.finalResultsPublishedAt = new Date();
        election.finalResultsPublishedBy = actorId;
      }
    }

    // Update overall statistics
    election.results.overallStats = await this.getElectionStatistics(electionId);

    await election.save();

    // Update candidate results
    if (phase === 1) {
      for (const batchResult of results) {
        for (const winner of batchResult.winners) {
          await ElectionCandidate.findByIdAndUpdate(winner.candidateId, {
            "votingResults.totalVotes": winner.votes,
            "votingResults.votePercentage": winner.percentage,
            "votingResults.rank": winner.rank,
            "votingResults.isWinner": winner.rank <= 5 // or configurable
          });
        }
      }
    } else if (phase === 2) {
      for (const postResult of results) {
        if (postResult.winner) {
          await ElectionCandidate.findByIdAndUpdate(postResult.winner.candidateId, {
            "votingResults.totalVotes": postResult.winner.votes,
            "votingResults.votePercentage": postResult.winner.percentage,
            "votingResults.rank": 1,
            "votingResults.isWinner": true
          });
        }
        
        if (postResult.runnerUp) {
          await ElectionCandidate.findByIdAndUpdate(postResult.runnerUp.candidateId, {
            "votingResults.totalVotes": postResult.runnerUp.votes,
            "votingResults.votePercentage": postResult.runnerUp.percentage,
            "votingResults.rank": 2,
            "votingResults.isRunnerUp": true
          });
        }
      }
    }

    // Send notifications
    // Optionally create appointments for winners
    const createdAppointments = [];
    const appointmentErrors = [];

    if (autoCreateAppointments) {
      try {
        // Phase 1: map batch winners to executive member posts
        if (phase === 1) {
          // Load executive posts for assignment
          const execPosts = await EcPost.find({ code: /EXECUTIVE_MEMBER/i, isActive: true }).sort({ displayOrder: 1 });
          let postIndex = 0;

          for (const batchResult of results) {
            for (const winner of batchResult.winners) {
              try {
                const candidate = await ElectionCandidate.findById(winner.candidateId).populate('memberId');
                if (!candidate || !candidate.memberId) {
                  appointmentErrors.push({ candidateId: winner.candidateId, reason: 'Candidate or member not found' });
                  continue;
                }

                // Find next available exec post for this term
                let assignedPost = null;
                const termId = election.termId;

                for (let i = 0; i < execPosts.length; i++) {
                  const idx = (postIndex + i) % execPosts.length;
                  const post = execPosts[idx];
                  const activeHolder = await require('../models/EcAppointment').EcAppointment.findOne({ termId, postId: post._id, endsOn: null });
                  if (!activeHolder) {
                    assignedPost = post;
                    postIndex = idx + 1;
                    break;
                  }
                }

                if (!assignedPost) {
                  appointmentErrors.push({ candidateId: winner.candidateId, reason: 'No available executive post to assign' });
                  continue;
                }

                const appointPayload = {
                  termId: election.termId,
                  postId: assignedPost._id,
                  memberId: candidate.memberId._id,
                  startsOn: election.termId ? (await EcTerm.findById(election.termId)).startsOn : new Date(),
                  source: 'Election'
                };

                const appointment = await GovernanceService.appointMember(appointPayload, actorId, requestId);
                createdAppointments.push(appointment);
              } catch (err) {
                appointmentErrors.push({ candidateId: winner.candidateId, reason: err.message });
              }
            }
          }

        } else if (phase === 2) {
          // Phase 2: winners are assigned to their specific posts
          for (const postResult of results) {
            if (!postResult.winner) continue;
            try {
              const candidate = await ElectionCandidate.findById(postResult.winner.candidateId).populate('memberId');
              if (!candidate || !candidate.memberId) {
                appointmentErrors.push({ candidateId: postResult.winner.candidateId, reason: 'Candidate or member not found' });
                continue;
              }

              if (!candidate.postId) {
                appointmentErrors.push({ candidateId: postResult.winner.candidateId, reason: 'Candidate has no postId' });
                continue;
              }

              // Load post to determine memberEcYears requirement
              const post = await require('../models/EcPost').EcPost.findById(candidate.postId);
              
              const appointPayload = {
                termId: election.termId,
                postId: candidate.postId,
                memberId: candidate.memberId._id,
                startsOn: election.termId ? (await EcTerm.findById(election.termId)).startsOn : new Date(),
                source: 'Election',
                // For election winners, satisfy EC experience requirement automatically
                // since elections already validate eligibility through their own process
                memberEcYears: post?.minEcYears || 0
              };

              const appointment = await GovernanceService.appointMember(appointPayload, actorId, requestId);
              createdAppointments.push(appointment);
            } catch (err) {
              appointmentErrors.push({ candidateId: postResult.winner.candidateId, reason: err.message });
            }
          }
        }
      } catch (err) {
        appointmentErrors.push({ reason: err.message });
      }
    }

    await NotificationService.createForRoleNames(["Member"], {
      title: `Election Results Published - Phase ${phase}`,
      message: `Results for ${election.name} Phase ${phase} have been published and are now available.`,
      category: "Election",
      actionUrl: `/dashboard/elections/${electionId}/results`,
      entityType: "Election",
      entityId: election._id.toString()
    });

    await AuditService.log({
      actorId,
      action: "ELECTION_RESULTS_PUBLISHED",
      resource: "Election",
      resourceId: election._id.toString(),
      requestId,
      metadata: { phase, resultsCount: results.length, createdAppointments: createdAppointments.map(a => a._id?.toString()).slice(0, 20) }
    });

    return { election, results, createdAppointments, appointmentErrors };
  }

  // Legacy methods for backward compatibility
  static async addCandidate(payload, actorId, requestId) {
    // Convert legacy format to new format
    const newPayload = {
      electionId: payload.electionId,
      phase: payload.postId ? 2 : 1,
      postId: payload.postId,
      candidateStatement: "",
      nominationType: "Self_Nomination"
    };

    return this.submitCandidateApplication(newPayload, actorId, requestId);
  }

  static async validateCandidate(candidateId, action, reason, actorId, requestId) {
    const decision = {
      status: action,
      reason: reason,
      comments: ""
    };

    return ElectionCommissionService.reviewCandidateApplication(candidateId, decision, actorId, requestId);
  }

  static async cancelCandidate(candidateId, reason, actorId, requestId) {
    return this.withdrawCandidateApplication(candidateId, reason, actorId, requestId);
  }

  static async updatePhase(electionId, payload, actorId, requestId) {
    return ElectionCommissionService.updateElectionPhase(electionId, payload, actorId, requestId);
  }
  
  // Get eligible posts for a member (checks year and EC experience requirements)
  static async getEligiblePostsForMember(memberId, electionId) {
    const member = await Member.findById(memberId)
      .populate('userId', 'firstName lastName email studentId');

    if (!member) {
      throw new ApiError(404, "Member not found");
    }

    const election = await Election.findById(electionId);
    if (!election) {
      throw new ApiError(404, "Election not found");
    }

    // Get all active EC posts
    const posts = await EcPost.find({ isActive: true }).sort({ displayOrder: 1 });

    // Calculate member's EC years
    const memberEcYears = this.computeEcYears(member);
    const memberYear = member.currentYear;

    // Check eligibility for each post
    const eligibility = posts.map(post => {
      const eligible = {
        post: {
          _id: post._id,
          title: post.title,
          code: post.code,
          displayOrder: post.displayOrder,
          minYear: post.minYear,
          minEcYears: post.minEcYears,
        },
        isEligible: true,
        reasons: []
      };

      // Check minimum year requirement
      if (post.minYear && memberYear < post.minYear) {
        eligible.isEligible = false;
        eligible.reasons.push(
          `Requires ${post.minYear}${this.getOrdinalSuffix(post.minYear)} year, but you are in ${memberYear}${this.getOrdinalSuffix(memberYear)} year`
        );
      }

      // Check minimum EC experience requirement
      if (post.minEcYears && memberEcYears < post.minEcYears) {
        eligible.isEligible = false;
        eligible.reasons.push(
          `Requires ${post.minEcYears} ${post.minEcYears === 1 ? 'year' : 'years'} of EC experience, but you have ${memberEcYears} ${memberEcYears === 1 ? 'year' : 'years'}`
        );
      }

      return eligible;
    });

    return {
      member: {
        _id: member._id,
        studentId: member.studentId || member.userId?.studentId,
        name: `${member.userId?.firstName} ${member.userId?.lastName}`,
        batch: member.batch,
        currentYear: memberYear,
        ecYears: memberEcYears,
        ecExperience: member.ecExperience
      },
      eligibility: eligibility.filter(e => e.isEligible),
      ineligible: eligibility.filter(e => !e.isEligible)
    };
  }


  /**
   * Delete an election and all related data (cascading delete)
   * @param {string} electionId - Election ID to delete
   * @param {string} actorId - User ID performing the deletion
   * @param {string} requestId - Request ID for audit
   * @returns {Promise<Object>} Deletion summary
   */
  static async deleteElection(electionId, actorId, requestId) {
    const { Election } = require("../models/Election");
    const { ElectionCandidate } = require("../models/ElectionCandidate");
    const { Vote } = require("../models/Vote");
    const { ElectionNomination } = require("../models/ElectionNomination");
    const { ElectionDispute } = require("../models/ElectionDispute");
    const { VoteRecording } = require("../models/VoteRecording");
    const { EcAppointment } = require("../models/EcAppointment");
    const { ElectionCommission } = require("../models/ElectionCommission");
    const cloudinary = require("cloudinary").v2;

    const election = await Election.findById(electionId);
    if (!election) {
      throw new ApiError(404, "Election not found");
    }

    // Prevent deletion of active elections
    if (["Phase1_Active", "Phase2_Active"].includes(election.status)) {
      throw new ApiError(
        400,
        "Cannot delete an active election. Please cancel it first."
      );
    }

    // Start deletion process - collect statistics
    const deletionStats = {
      electionId,
      electionName: election.name,
      deletedAt: new Date(),
      deletedBy: actorId,
      cascadedDeletes: {}
    };

    try {
      // 1. Delete all votes for this election
      const votesResult = await Vote.deleteMany({ electionId });
      deletionStats.cascadedDeletes.votes = votesResult.deletedCount;

      // 2. Delete all vote recordings (and cleanup Cloudinary assets)
      const voteRecordings = await VoteRecording.find({ electionId });
      deletionStats.cascadedDeletes.voteRecordings = voteRecordings.length;
      
      // Delete from Cloudinary
      for (const recording of voteRecordings) {
        try {
          if (recording.cloudinaryPublicId) {
            await cloudinary.uploader.destroy(recording.cloudinaryPublicId, {
              resource_type: "video"
            });
          }
        } catch (cloudinaryError) {
          console.error(
            `Failed to delete Cloudinary asset ${recording.cloudinaryPublicId}:`,
            cloudinaryError
          );
          // Continue with deletion even if Cloudinary cleanup fails
        }
      }
      
      await VoteRecording.deleteMany({ electionId });

      // 3. Delete all candidates for this election
      const candidatesResult = await ElectionCandidate.deleteMany({ electionId });
      deletionStats.cascadedDeletes.candidates = candidatesResult.deletedCount;

      // 4. Delete all nominations for this election
      const nominationsResult = await ElectionNomination.deleteMany({ electionId });
      deletionStats.cascadedDeletes.nominations = nominationsResult.deletedCount;

      // 5. Delete all disputes for this election
      const disputesResult = await ElectionDispute.deleteMany({ electionId });
      deletionStats.cascadedDeletes.disputes = disputesResult.deletedCount;

      // 6. Delete election commission if exists
      if (election.commissionId) {
        await ElectionCommission.findByIdAndDelete(election.commissionId);
        deletionStats.cascadedDeletes.commission = 1;
      }

      // 7. Note: We don't delete EcAppointments as they are historical records
      // They reference termId, not electionId directly
      deletionStats.cascadedDeletes.appointments = 0;
      deletionStats.note = "EC Appointments preserved as historical records";

      // 8. Finally, delete the election itself
      await Election.findByIdAndDelete(electionId);

      // Log the deletion in audit trail
      console.log(
        `Election ${electionId} deleted by ${actorId}`,
        JSON.stringify(deletionStats)
      );

      return {
        success: true,
        message: "Election and all related data deleted successfully",
        stats: deletionStats
      };
    } catch (error) {
      console.error("Error during election deletion:", error);
      throw new ApiError(
        500,
        `Failed to delete election: ${error.message}`
      );
    }
  }
}


module.exports = { EnhancedElectionService };

