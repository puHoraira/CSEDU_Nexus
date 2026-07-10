const { ApiError } = require("../core/ApiError");
const mongoose = require("mongoose");
const { ElectionCommission } = require("../models/ElectionCommission");
const { Election } = require("../models/Election");
const { ElectionCandidate } = require("../models/ElectionCandidate");
const { ElectionDispute } = require("../models/ElectionDispute");
const { ElectionNomination } = require("../models/ElectionNomination");
const { Vote } = require("../models/Vote");
const { Member } = require("../models/Member");
const { User } = require("../models/User");
const { EcPost } = require("../models/EcPost");
const { EcTerm } = require("../models/EcTerm");
const { AuditService } = require("./AuditService");
const { NotificationService } = require("./NotificationService");

class ElectionCommissionService {
  
  // Commission Management
  static async createCommission(electionId, commissionData, actorId, requestId) {
    const election = await Election.findById(electionId);
    if (!election) {
      throw new ApiError(404, "Election not found");
    }

    // Check if commission already exists
    const existingCommission = await ElectionCommission.findOne({ electionId });
    if (existingCommission) {
      throw new ApiError(409, "Election commission already exists for this election");
    }

    // Validate chief commissioner (must be Moderator)
    const chiefCommissioner = await User.findById(commissionData.chiefCommissioner);
    if (!chiefCommissioner || !chiefCommissioner.roles.includes("Moderator")) {
      throw new ApiError(400, "Chief Commissioner must be a Moderator");
    }

    // Validate other commissioners
    if (commissionData.commissioners.length !== 2) {
      throw new ApiError(400, "Exactly 2 additional commissioners required");
    }

    for (const commissioner of commissionData.commissioners) {
      const user = await User.findById(commissioner.userId);
      if (!user) {
        throw new ApiError(400, `Commissioner ${commissioner.userId} not found`);
      }
      
      // Commissioners cannot be current EC members or candidates
      const member = await Member.findOne({ userId: user._id });
      if (member) {
        const isCandidate = await ElectionCandidate.findOne({ 
          electionId, 
          memberId: member._id,
          status: { $in: ["Submitted", "Under_Review", "Approved"] }
        });
        
        if (isCandidate) {
          throw new ApiError(400, `${user.firstName} ${user.lastName} cannot be a commissioner as they are a candidate`);
        }
      }
    }

    const commission = await ElectionCommission.create({
      electionId,
      termId: election.termId,
      chiefCommissioner: commissionData.chiefCommissioner,
      commissioners: commissionData.commissioners.map(c => ({
        ...c,
        appointedBy: actorId
      })),
      electionConfig: commissionData.electionConfig || {},
      status: "Active",
      formedAt: new Date()
    });

    // Update election with commission reference
    election.commissionId = commission._id;
    election.supervisedBy = commissionData.chiefCommissioner;
    await election.save();

    await AuditService.log({
      actorId,
      action: "ELECTION_COMMISSION_CREATED",
      resource: "ElectionCommission",
      resourceId: commission._id.toString(),
      requestId,
      metadata: { electionId, commissionMembers: commission.commissioners.length + 1 }
    });

    return commission;
  }

  static async getCommission(electionId) {
    const commission = await ElectionCommission.findOne({ electionId })
      .populate("chiefCommissioner", "firstName lastName email")
      .populate("commissioners.userId", "firstName lastName email")
      .populate("commissioners.appointedBy", "firstName lastName")
      .populate("electionId", "name status currentPhase")
      .populate("termId", "name startsOn endsOn");

    if (!commission) {
      throw new ApiError(404, "Election commission not found");
    }

    return commission;
  }

  static async updateCommissionConfig(electionId, configData, actorId, requestId) {
    const commission = await ElectionCommission.findOne({ electionId });
    if (!commission) {
      throw new ApiError(404, "Election commission not found");
    }

    // Only chief commissioner or chairman can update config
    const user = await User.findById(actorId);
    if (!user) {
      throw new ApiError(404, "Actor user not found");
    }
    if (commission.chiefCommissioner.toString() !== actorId && 
        !user.roles.includes("Chief Patron") && 
        !user.roles.includes("Chairman")) {
      throw new ApiError(403, "Only Chief Commissioner or Chairman can update commission configuration");
    }

    commission.electionConfig = { ...commission.electionConfig, ...configData };
    await commission.save();

    await AuditService.log({
      actorId,
      action: "ELECTION_COMMISSION_CONFIG_UPDATED",
      resource: "ElectionCommission",
      resourceId: commission._id.toString(),
      requestId,
      metadata: { configChanges: Object.keys(configData) }
    });

    return commission;
  }

  // Candidate Management
  static async reviewCandidateApplication(candidateId, decision, actorId, requestId) {
    const candidate = await ElectionCandidate.findById(candidateId)
      .populate("memberId", "studentId batch currentYear userId")
      .populate("electionId", "name commissionId")
      .populate("postId", "title code");

    if (!candidate) {
      throw new ApiError(404, "Candidate not found");
    }

    const commission = await ElectionCommission.findById(candidate.electionId.commissionId);
    if (!commission) {
      throw new ApiError(404, "Election commission not found");
    }

    // Check if user is authorized (commission member)
    const isAuthorized = commission.chiefCommissioner.toString() === actorId ||
                        commission.commissioners.some(c => c.userId.toString() === actorId);

    if (!isAuthorized) {
      const user = await User.findById(actorId);
      if (!user) {
        throw new ApiError(404, "Actor user not found");
      }
      if (!user.roles.includes("Chief Patron") && !user.roles.includes("Chairman")) {
        throw new ApiError(403, "Only commission members can review candidate applications");
      }
    }

    // Perform eligibility check
    const eligibilityResult = await this.checkCandidateEligibility(candidate);
    
    candidate.eligibilityChecked = true;
    candidate.eligibilityCheckDate = new Date();
    candidate.eligibilityCheckedBy = actorId;
    candidate.eligibilityDetails = eligibilityResult.details;

    if (!eligibilityResult.eligible) {
      candidate.status = "Rejected";
      candidate.rejectionReason = eligibilityResult.reason;
    } else {
      candidate.status = decision.status;
      candidate.rejectionReason = decision.status === "Rejected" ? decision.reason : "";
    }

    candidate.reviewedBy = actorId;
    candidate.reviewedAt = new Date();
    candidate.reviewComments = decision.comments || "";

    await candidate.save();

    // Record commission decision
    const commissionDecision = {
      decidedBy: actorId,
      decidedAt: new Date(),
      decision: candidate.status,
      conditions: decision.conditions || "",
      votingRecord: decision.votingRecord || []
    };

    await ElectionCommission.findByIdAndUpdate(
      commission._id,
      {
        $push: {
          decisions: {
            title: `Candidate Review: ${candidate.memberId.userId.firstName} ${candidate.memberId.userId.lastName}`,
            description: `Application ${candidate.status.toLowerCase()} for ${candidate.postId ? candidate.postId.title : 'Executive Member'}`,
            decidedBy: actorId,
            type: candidate.status === "Approved" ? "Candidate_Approval" : "Candidate_Rejection",
            affectedEntity: {
              entityType: "Candidate",
              entityId: candidate._id
            },
            votingRecord: decision.votingRecord || []
          }
        }
      }
    );

    // Send notification to candidate
    await NotificationService.createForUser(candidate.memberId.userId, {
      title: `Candidate Application ${candidate.status}`,
      message: candidate.status === "Approved" 
        ? `Your application for ${candidate.postId ? candidate.postId.title : 'Executive Member'} has been approved.`
        : `Your application has been ${candidate.status.toLowerCase()}. Reason: ${candidate.rejectionReason}`,
      category: "Election",
      actionUrl: `/dashboard/elections/${candidate.electionId._id}/candidates`,
      entityType: "ElectionCandidate",
      entityId: candidate._id.toString()
    });

    await AuditService.log({
      actorId,
      action: "ELECTION_CANDIDATE_REVIEWED",
      resource: "ElectionCandidate",
      resourceId: candidate._id.toString(),
      requestId,
      metadata: { 
        decision: candidate.status, 
        eligible: eligibilityResult.eligible,
        postId: candidate.postId?.toString()
      }
    });

    return candidate;
  }

  static async checkCandidateEligibility(candidate) {
    const member = await Member.findById(candidate.memberId)
      .populate("userId", "firstName lastName email");

    if (!member) {
      return { eligible: false, reason: "Member record not found", details: {} };
    }

    const eligibilityDetails = {
      cgpa: member.cgpa || 0,
      attendancePercentage: member.attendancePercentage || 0,
      disciplinaryActions: member.disciplinaryActions || 0,
      isGraduating: member.isGraduating || false
    };

    // Get election configuration
    const election = await Election.findById(candidate.electionId);
    const commission = await ElectionCommission.findById(election.commissionId);
    const config = commission?.electionConfig || {};

    // Check CGPA requirement
    if (eligibilityDetails.cgpa < (config.minCgpaForCandidacy || 2.5)) {
      return {
        eligible: false,
        reason: `CGPA ${eligibilityDetails.cgpa} is below minimum requirement of ${config.minCgpaForCandidacy || 2.5}`,
        details: eligibilityDetails
      };
    }

    // Check attendance requirement
    if (eligibilityDetails.attendancePercentage < (config.minAttendanceForVoting || 75)) {
      return {
        eligible: false,
        reason: `Attendance ${eligibilityDetails.attendancePercentage}% is below minimum requirement of ${config.minAttendanceForVoting || 75}%`,
        details: eligibilityDetails
      };
    }

    // Check disciplinary actions
    if (eligibilityDetails.disciplinaryActions > (config.maxDisciplinaryActions || 0)) {
      return {
        eligible: false,
        reason: `Has ${eligibilityDetails.disciplinaryActions} disciplinary actions, maximum allowed is ${config.maxDisciplinaryActions || 0}`,
        details: eligibilityDetails
      };
    }

    // Check if graduating (if configured to exclude)
    if (config.excludeGraduating && eligibilityDetails.isGraduating) {
      return {
        eligible: false,
        reason: "Graduating students are not eligible for candidacy",
        details: eligibilityDetails
      };
    }

    // Check post-specific requirements
    if (candidate.postId) {
      const post = await EcPost.findById(candidate.postId);
      if (post) {
        if (member.currentYear < post.minYear) {
          return {
            eligible: false,
            reason: `Current year ${member.currentYear} is below minimum requirement of ${post.minYear} for ${post.title}`,
            details: eligibilityDetails
          };
        }

        // Check EC experience requirement
        const ecExperience = member.ecExperience || [];
        const ecYears = ecExperience.length;
        if (ecYears < post.minEcYears) {
          return {
            eligible: false,
            reason: `EC experience ${ecYears} years is below minimum requirement of ${post.minEcYears} years for ${post.title}`,
            details: eligibilityDetails
          };
        }
      }
    }

    return { eligible: true, reason: "All eligibility criteria met", details: eligibilityDetails };
  }

  // Election Management
  static async updateElectionPhase(electionId, phaseData, actorId, requestId) {
    const election = await Election.findById(electionId);
    if (!election) {
      throw new ApiError(404, "Election not found");
    }

    const commission = await ElectionCommission.findById(election.commissionId);
    if (!commission) {
      throw new ApiError(404, "Election commission not found");
    }

    // Check authorization
    const isAuthorized = commission.chiefCommissioner.toString() === actorId ||
                        commission.commissioners.some(c => c.userId.toString() === actorId);

    if (!isAuthorized) {
      const user = await User.findById(actorId);
      if (!user) {
        throw new ApiError(404, "Actor user not found");
      }
      if (!user.roles.includes("Chief Patron") && !user.roles.includes("Chairman")) {
        throw new ApiError(403, "Only commission members can update election phases");
      }
    }

    // Update election phase
    if (phaseData.currentPhase !== undefined) {
      election.currentPhase = phaseData.currentPhase;
    }

    if (phaseData.status) {
      election.status = phaseData.status;
    }

    // Update phase-specific data
    if (phaseData.phase1) {
      election.phase1 = { ...election.phase1, ...phaseData.phase1 };
    }

    if (phaseData.phase2) {
      election.phase2 = { ...election.phase2, ...phaseData.phase2 };
    }

    await election.save();

    // Record commission decision
    await ElectionCommission.findByIdAndUpdate(
      commission._id,
      {
        $push: {
          decisions: {
            title: `Election Phase Update`,
            description: `Updated election to phase ${election.currentPhase} with status ${election.status}`,
            decidedBy: actorId,
            type: "Schedule_Change",
            affectedEntity: {
              entityType: "Election",
              entityId: election._id
            }
          }
        }
      }
    );

    await AuditService.log({
      actorId,
      action: "ELECTION_PHASE_UPDATED",
      resource: "Election",
      resourceId: election._id.toString(),
      requestId,
      metadata: { 
        currentPhase: election.currentPhase,
        status: election.status
      }
    });

    return election;
  }

  // Results and Analytics
  static async calculateResults(electionId, phase) {
    const election = await Election.findById(electionId);
    if (!election) {
      throw new ApiError(404, "Election not found");
    }

    if (phase === 1) {
      return this.calculatePhase1Results(electionId);
    } else if (phase === 2) {
      return this.calculatePhase2Results(electionId);
    } else {
      throw new ApiError(400, "Invalid phase specified");
    }
  }

  static async calculatePhase1Results(electionId) {
    // Get all votes for phase 1
    const votes = await Vote.find({ 
      electionId, 
      phase: 1, 
      isValid: true 
    }).populate({
      path: "candidateId",
      populate: {
        path: "memberId",
        select: "batch studentId userId",
        populate: {
          path: "userId",
          select: "firstName lastName"
        }
      }
    });

    // Group by batch
    const batchResults = {};
    
    votes.forEach(vote => {
      const batch = vote.candidateId.batch;
      if (!batchResults[batch]) {
        batchResults[batch] = {
          batch,
          totalVotes: 0,
          candidates: {}
        };
      }
      
      batchResults[batch].totalVotes++;
      
      const candidateId = vote.candidateId._id.toString();
      if (!batchResults[batch].candidates[candidateId]) {
        batchResults[batch].candidates[candidateId] = {
          candidateId: vote.candidateId._id,
          candidate: vote.candidateId,
          votes: 0
        };
      }
      
      batchResults[batch].candidates[candidateId].votes++;
    });

    // Calculate winners for each batch (top 5 or configured number)
    const results = [];
    
    for (const [batch, batchData] of Object.entries(batchResults)) {
      const candidates = Object.values(batchData.candidates)
        .sort((a, b) => b.votes - a.votes);
      
      const maxWinners = 5; // or get from election config
      const winners = candidates.slice(0, maxWinners).map((candidate, index) => ({
        candidateId: candidate.candidateId,
        votes: candidate.votes,
        percentage: batchData.totalVotes > 0 ? (candidate.votes / batchData.totalVotes * 100) : 0,
        rank: index + 1
      }));

      results.push({
        batch,
        totalVotes: batchData.totalVotes,
        totalVoters: await this.getUniqueVoterCount(electionId, 1, batch),
        winners
      });
    }

    return results;
  }

  static async calculatePhase2Results(electionId) {
    // Get all votes for phase 2
    const votes = await Vote.find({ 
      electionId, 
      phase: 2, 
      isValid: true 
    }).populate({
      path: "candidateId",
      populate: [
        {
          path: "memberId",
          select: "studentId userId",
          populate: {
            path: "userId",
            select: "firstName lastName"
          }
        },
        {
          path: "postId",
          select: "title code displayOrder"
        }
      ]
    });

    // Group by post
    const postResults = {};
    
    votes.forEach(vote => {
      const postId = vote.candidateId.postId._id.toString();
      if (!postResults[postId]) {
        postResults[postId] = {
          postId: vote.candidateId.postId._id,
          post: vote.candidateId.postId,
          totalVotes: 0,
          candidates: {}
        };
      }
      
      postResults[postId].totalVotes++;
      
      const candidateId = vote.candidateId._id.toString();
      if (!postResults[postId].candidates[candidateId]) {
        postResults[postId].candidates[candidateId] = {
          candidateId: vote.candidateId._id,
          candidate: vote.candidateId,
          votes: 0
        };
      }
      
      postResults[postId].candidates[candidateId].votes++;
    });

    // Calculate winners for each post
    const results = [];
    
    for (const [postId, postData] of Object.entries(postResults)) {
      const candidates = Object.values(postData.candidates)
        .sort((a, b) => b.votes - a.votes);
      
      const winner = candidates[0] ? {
        candidateId: candidates[0].candidateId,
        votes: candidates[0].votes,
        percentage: postData.totalVotes > 0 ? (candidates[0].votes / postData.totalVotes * 100) : 0
      } : null;

      const runnerUp = candidates[1] ? {
        candidateId: candidates[1].candidateId,
        votes: candidates[1].votes,
        percentage: postData.totalVotes > 0 ? (candidates[1].votes / postData.totalVotes * 100) : 0
      } : null;

      results.push({
        postId: postData.postId,
        post: postData.post,
        totalVotes: postData.totalVotes,
        totalVoters: await this.getUniqueVoterCount(electionId, 2, null, postId),
        winner,
        runnerUp,
        allCandidates: candidates.map((candidate, index) => ({
          ...candidate,
          rank: index + 1,
          percentage: postData.totalVotes > 0 ? (candidate.votes / postData.totalVotes * 100) : 0
        }))
      });
    }

    return results.sort((a, b) => a.post.displayOrder - b.post.displayOrder);
  }

  static async getUniqueVoterCount(electionId, phase, batch = null, postId = null) {
    const query = { electionId, phase, isValid: true };
    
    if (batch) {
      query.batch = batch;
    }
    
    if (postId) {
      query.postId = postId;
    }

    const uniqueVoters = await Vote.distinct("voterMemberId", query);
    return uniqueVoters.length;
  }

  // Dispute Management
  static async createDispute(disputeData, actorId, requestId) {
    const election = await Election.findById(disputeData.electionId);
    if (!election) {
      throw new ApiError(404, "Election not found");
    }

    const commission = await ElectionCommission.findById(election.commissionId);
    if (!commission) {
      throw new ApiError(404, "Election commission not found");
    }

    const complainant = await Member.findOne({ userId: actorId });
    if (!complainant) {
      throw new ApiError(404, "Member record not found for complainant");
    }

    const dispute = await ElectionDispute.create({
      ...disputeData,
      commissionId: commission._id,
      complainant: {
        memberId: complainant._id,
        role: disputeData.complainantRole || "Voter"
      },
      submittedAt: new Date(),
      status: "Submitted"
    });

    // Notify commission members
    const commissionMembers = [commission.chiefCommissioner, ...commission.commissioners.map(c => c.userId)];
    
    for (const memberId of commissionMembers) {
      await NotificationService.createForUser(memberId, {
        title: "New Election Dispute Submitted",
        message: `A new ${disputeData.disputeType.replace('_', ' ').toLowerCase()} dispute has been submitted for ${election.name}`,
        category: "Election",
        actionUrl: `/dashboard/elections/${election._id}/disputes/${dispute._id}`,
        entityType: "ElectionDispute",
        entityId: dispute._id.toString()
      });
    }

    await AuditService.log({
      actorId,
      action: "ELECTION_DISPUTE_CREATED",
      resource: "ElectionDispute",
      resourceId: dispute._id.toString(),
      requestId,
      metadata: { 
        electionId: disputeData.electionId,
        disputeType: disputeData.disputeType
      }
    });

    return dispute;
  }

  // Commission Announcements
  static async createAnnouncement(electionId, announcementData, actorId, requestId) {
    const commission = await ElectionCommission.findOne({ electionId });
    if (!commission) {
      throw new ApiError(404, "Election commission not found");
    }

    // Check authorization
    const isAuthorized = commission.chiefCommissioner.toString() === actorId ||
                        commission.commissioners.some(c => c.userId.toString() === actorId);

    if (!isAuthorized) {
      throw new ApiError(403, "Only commission members can create announcements");
    }

    const announcement = {
      title: announcementData.title,
      content: announcementData.content,
      publishedBy: actorId,
      targetAudience: announcementData.targetAudience || "All_Members",
      isPublic: announcementData.isPublic !== false
    };

    await ElectionCommission.findByIdAndUpdate(
      commission._id,
      { $push: { announcements: announcement } }
    );

    // Send notifications based on target audience
    if (announcement.targetAudience === "All_Members") {
      await NotificationService.createForRoleNames(["Member"], {
        title: announcement.title,
        message: announcement.content.substring(0, 200) + (announcement.content.length > 200 ? "..." : ""),
        category: "Election",
        actionUrl: `/dashboard/elections/${electionId}/announcements`,
        entityType: "ElectionCommission",
        entityId: commission._id.toString()
      });
    }

    await AuditService.log({
      actorId,
      action: "ELECTION_ANNOUNCEMENT_CREATED",
      resource: "ElectionCommission",
      resourceId: commission._id.toString(),
      requestId,
      metadata: { 
        electionId,
        targetAudience: announcement.targetAudience
      }
    });

    return commission;
  }
}

module.exports = { ElectionCommissionService };