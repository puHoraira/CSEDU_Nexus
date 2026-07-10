const { ApiResponse } = require("../core/ApiResponse");
const { asyncHandler } = require("../core/asyncHandler");
const { EnhancedElectionService } = require("../services/EnhancedElectionService");
const { ElectionCommissionService } = require("../services/ElectionCommissionService");

class EnhancedElectionController {
  
  // Election Management
  static create = asyncHandler(async (req, res) => {
    const election = await EnhancedElectionService.createElection(
      req.body, 
      req.auth.userId, 
      req.requestMeta.requestId
    );
    return res.status(201).json(
      new ApiResponse(201, election, "Election created successfully")
    );
  });

  static list = asyncHandler(async (req, res) => {
    const { status, termId, currentPhase } = req.query;
    const elections = await EnhancedElectionService.listElections({
      status,
      termId,
      currentPhase: currentPhase ? parseInt(currentPhase) : undefined
    });
    return res.json(
      new ApiResponse(200, elections, "Elections retrieved successfully")
    );
  });

  static getById = asyncHandler(async (req, res) => {
    const { electionId } = req.params;
    const election = await EnhancedElectionService.getElectionById(electionId);
    return res.json(
      new ApiResponse(200, election, "Election retrieved successfully")
    );
  });

  static update = asyncHandler(async (req, res) => {
    const { electionId } = req.params;
    const election = await EnhancedElectionService.updateElection(
      electionId,
      req.body,
      req.auth.userId,
      req.requestMeta.requestId
    );
    return res.json(
      new ApiResponse(200, election, "Election updated successfully")
    );
  });

  // Election Commission Management
  static createCommission = asyncHandler(async (req, res) => {
    const { electionId } = req.params;
    const commission = await ElectionCommissionService.createCommission(
      electionId,
      req.body,
      req.auth.userId,
      req.requestMeta.requestId
    );
    return res.status(201).json(
      new ApiResponse(201, commission, "Election commission created successfully")
    );
  });

  static getCommission = asyncHandler(async (req, res) => {
    const { electionId } = req.params;
    const commission = await ElectionCommissionService.getCommission(electionId);
    return res.json(
      new ApiResponse(200, commission, "Election commission retrieved successfully")
    );
  });

  static updateCommissionConfig = asyncHandler(async (req, res) => {
    const { electionId } = req.params;
    const commission = await ElectionCommissionService.updateCommissionConfig(
      electionId,
      req.body,
      req.auth.userId,
      req.requestMeta.requestId
    );
    return res.json(
      new ApiResponse(200, commission, "Commission configuration updated successfully")
    );
  });

  // Candidate Management
  static submitCandidateApplication = asyncHandler(async (req, res) => {
    const candidate = await EnhancedElectionService.submitCandidateApplication(
      req.body,
      req.auth.userId,
      req.requestMeta.requestId
    );
    return res.status(201).json(
      new ApiResponse(201, candidate, "Candidate application submitted successfully")
    );
  });

  static listCandidates = asyncHandler(async (req, res) => {
    const { electionId } = req.params;
    const { phase, status, postId, batch } = req.query;
    
    const candidates = await EnhancedElectionService.listCandidates(electionId, {
      phase: phase ? parseInt(phase) : undefined,
      status,
      postId,
      batch
    });
    
    return res.json(
      new ApiResponse(200, candidates, "Candidates retrieved successfully")
    );
  });

  static getCandidateById = asyncHandler(async (req, res) => {
    const { candidateId } = req.params;
    const candidate = await EnhancedElectionService.getCandidateById(candidateId);
    return res.json(
      new ApiResponse(200, candidate, "Candidate retrieved successfully")
    );
  });

  static updateCandidateApplication = asyncHandler(async (req, res) => {
    const { candidateId } = req.params;
    const candidate = await EnhancedElectionService.updateCandidateApplication(
      candidateId,
      req.body,
      req.auth.userId,
      req.requestMeta.requestId
    );
    return res.json(
      new ApiResponse(200, candidate, "Candidate application updated successfully")
    );
  });

  static withdrawCandidateApplication = asyncHandler(async (req, res) => {
    const { candidateId } = req.params;
    const { reason } = req.body;
    
    const candidate = await EnhancedElectionService.withdrawCandidateApplication(
      candidateId,
      reason,
      req.auth.userId,
      req.requestMeta.requestId
    );
    
    return res.json(
      new ApiResponse(200, candidate, "Candidate application withdrawn successfully")
    );
  });

  static reviewCandidateApplication = asyncHandler(async (req, res) => {
    const { candidateId } = req.params;
    const candidate = await ElectionCommissionService.reviewCandidateApplication(
      candidateId,
      req.body,
      req.auth.userId,
      req.requestMeta.requestId
    );
    return res.json(
      new ApiResponse(200, candidate, "Candidate application reviewed successfully")
    );
  });

  // Voting System
  static castVote = asyncHandler(async (req, res) => {
    const result = await EnhancedElectionService.castVote(
      {
        ...req.body,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      },
      req.auth.userId,
      req.requestMeta.requestId
    );
    return res.status(201).json(
      new ApiResponse(201, result, "Vote cast successfully")
    );
  });

  static getVotingStatus = asyncHandler(async (req, res) => {
    const { electionId } = req.params;
    const status = await EnhancedElectionService.getVotingStatus(electionId, req.auth.userId);
    return res.json(
      new ApiResponse(200, status, "Voting status retrieved successfully")
    );
  });

  // Election Phase Management
  static updateElectionPhase = asyncHandler(async (req, res) => {
    const { electionId } = req.params;
    const election = await ElectionCommissionService.updateElectionPhase(
      electionId,
      req.body,
      req.auth.userId,
      req.requestMeta.requestId
    );
    return res.json(
      new ApiResponse(200, election, "Election phase updated successfully")
    );
  });

  // Results and Analytics
  static getResults = asyncHandler(async (req, res) => {
    const { electionId } = req.params;
    const { phase } = req.query;
    
    const results = await EnhancedElectionService.getResults(
      electionId, 
      phase ? parseInt(phase) : null
    );
    
    return res.json(
      new ApiResponse(200, results, "Election results retrieved successfully")
    );
  });

  static publishResults = asyncHandler(async (req, res) => {
    const { electionId } = req.params;
    const { phase, autoCreateAppointments } = req.body;

    const result = await EnhancedElectionService.publishResults(
      electionId,
      phase,
      req.auth.userId,
      req.requestMeta.requestId,
      Boolean(autoCreateAppointments)
    );
    
    return res.json(
      new ApiResponse(200, result, "Election results published successfully")
    );
  });

  static getElectionStatistics = asyncHandler(async (req, res) => {
    const { electionId } = req.params;
    const stats = await EnhancedElectionService.getElectionStatistics(electionId);
    return res.json(
      new ApiResponse(200, stats, "Election statistics retrieved successfully")
    );
  });

  // Commission Announcements
  static createAnnouncement = asyncHandler(async (req, res) => {
    const { electionId } = req.params;
    const commission = await ElectionCommissionService.createAnnouncement(
      electionId,
      req.body,
      req.auth.userId,
      req.requestMeta.requestId
    );
    return res.status(201).json(
      new ApiResponse(201, commission, "Announcement created successfully")
    );
  });

  static getAnnouncements = asyncHandler(async (req, res) => {
    const { electionId } = req.params;
    const commission = await ElectionCommissionService.getCommission(electionId);
    
    const announcements = commission.announcements
      .filter(announcement => announcement.isPublic || req.auth.roles.includes("Moderator"))
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    
    return res.json(
      new ApiResponse(200, announcements, "Announcements retrieved successfully")
    );
  });

  // Dispute Management
  static createDispute = asyncHandler(async (req, res) => {
    const dispute = await ElectionCommissionService.createDispute(
      req.body,
      req.auth.userId,
      req.requestMeta.requestId
    );
    return res.status(201).json(
      new ApiResponse(201, dispute, "Election dispute created successfully")
    );
  });

  static getDisputes = asyncHandler(async (req, res) => {
    const { electionId } = req.params;
    const { status, disputeType } = req.query;
    
    const query = { electionId };
    if (status) query.status = status;
    if (disputeType) query.disputeType = disputeType;
    
    const { ElectionDispute } = require("../models/ElectionDispute");
    const disputes = await ElectionDispute.find(query)
      .populate("complainant.memberId", "studentId userId")
      .populate("respondent.memberId", "studentId userId")
      .populate("respondent.candidateId", "memberId postId")
      .sort({ submittedAt: -1 });
    
    return res.json(
      new ApiResponse(200, disputes, "Election disputes retrieved successfully")
    );
  });

  // Legacy endpoints for backward compatibility
  static addCandidate = asyncHandler(async (req, res) => {
    const candidate = await EnhancedElectionService.addCandidate(
      req.body,
      req.auth.userId,
      req.requestMeta.requestId
    );
    return res.status(201).json(
      new ApiResponse(201, candidate, "Candidate added successfully")
    );
  });

  static validateCandidate = asyncHandler(async (req, res) => {
    const { candidateId } = req.params;
    const { action, reason } = req.body;
    
    const candidate = await EnhancedElectionService.validateCandidate(
      candidateId,
      action,
      reason,
      req.auth.userId,
      req.requestMeta.requestId
    );
    
    return res.json(
      new ApiResponse(200, candidate, "Candidate validation updated successfully")
    );
  });

  static cancelCandidate = asyncHandler(async (req, res) => {
    const { candidateId } = req.params;
    const { reason } = req.body;
    
    const candidate = await EnhancedElectionService.cancelCandidate(
      candidateId,
      reason,
      req.auth.userId,
      req.requestMeta.requestId
    );
    
    return res.json(
      new ApiResponse(200, candidate, "Candidate cancelled successfully")
    );
  });

  static updatePhase = asyncHandler(async (req, res) => {
    const { electionId } = req.params;
    const election = await EnhancedElectionService.updatePhase(
      electionId,
      req.body,
      req.auth.userId,
      req.requestMeta.requestId
    );
    return res.json(
      new ApiResponse(200, election, "Election phase updated successfully")
    );
  });

  // Utility endpoints
  static getEligibleBatches = asyncHandler(async (req, res) => {
    const { Member } = require("../models/Member");
    const batches = await Member.distinct("batch", { status: "Active" });
    return res.json(
      new ApiResponse(200, batches.sort(), "Eligible batches retrieved successfully")
    );
  });

  static getActivePosts = asyncHandler(async (req, res) => {
    const { EcPost } = require("../models/EcPost");
    const posts = await EcPost.find({ isActive: true }).sort({ displayOrder: 1 });
    return res.json(
      new ApiResponse(200, posts, "Active posts retrieved successfully")
    );
  });

  static getActiveTerms = asyncHandler(async (req, res) => {
    const { EcTerm } = require("../models/EcTerm");
    const terms = await EcTerm.find({ status: { $in: ["Draft", "Active"] } }).sort({ startsOn: -1 });
    return res.json(
      new ApiResponse(200, terms, "Active terms retrieved successfully")
    );
  });
}

module.exports = { EnhancedElectionController };
