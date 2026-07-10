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

    const member = await Member.findOne({ userId: actorId }).populate("userId", "firstName lastName email");
    if (!member) {
      throw new ApiError(404, "Member record not found");
    }

    if (member.membershipStatus?.status !== "Active") {
      throw new ApiError(400, "Only active members can apply as candidates");
    }

    // Check if already applied for this election and phase
    const existingApplication = await ElectionCandidate.findOne({
      electionId: payload.electionId,
      memberId: member._id,
      phase: payload.phase
    });

    if (existingApplication) {
      throw new ApiError(409, "You have already submitted an application for this phase");
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

  static async publishResults(electionId, phase, actorId, requestId, autoCreateAppointments = false) {
    const election = await Election.findById(electionId);
    if (!election) {
      throw new ApiError(404, "Election not found");
    }

    // Check authorization (commission members only)
    const commission = await ElectionCommission.findById(election.commissionId);
    if (!commission) {
      throw new ApiError(404, "Election commission not found");
    }

    const isAuthorized = commission.chiefCommissioner.toString() === actorId ||
                        commission.commissioners.some(c => c.userId.toString() === actorId);

    if (!isAuthorized) {
      const user = await User.findById(actorId);
      if (!user) {
        throw new ApiError(404, "Actor user not found");
      }
      if (!user.roles.includes("Chief Patron") && !user.roles.includes("Chairman")) {
        throw new ApiError(403, "Only commission members can publish results");
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

              const appointPayload = {
                termId: election.termId,
                postId: candidate.postId,
                memberId: candidate.memberId._id,
                startsOn: election.termId ? (await EcTerm.findById(election.termId)).startsOn : new Date(),
                source: 'Election'
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
}

module.exports = { EnhancedElectionService };