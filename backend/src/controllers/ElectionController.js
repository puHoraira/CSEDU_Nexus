const { ApiResponse } = require("../core/ApiResponse");
const { asyncHandler } = require("../core/asyncHandler");
const { ElectionService } = require("../services/ElectionService");
const { Phase1BatchService } = require("../services/Phase1BatchService");

class ElectionController {
  static create = asyncHandler(async (req, res) => {
    const payload = {
      ...req.body,
      startsOn: new Date(req.body.startsOn),
      endsOn: new Date(req.body.endsOn),
    };
    const row = await ElectionService.createElection(payload, req.auth.userId, req.requestMeta.requestId);
    return ApiResponse.created(res, row, "Election created");
  });

  static list = asyncHandler(async (req, res) => {
    const userId = req.auth?.userId || req.user?._id || null;
    const rows = await ElectionService.listElections(userId);
    return ApiResponse.ok(res, rows, "Elections");
  });

  static get = asyncHandler(async (req, res) => {
    const row = await ElectionService.getElection(req.params.id);
    return ApiResponse.ok(res, row, "Election details");
  });

  static update = asyncHandler(async (req, res) => {
    const row = await ElectionService.updateElection(
      req.params.id,
      req.body,
      req.auth.userId,
      req.requestMeta.requestId
    );
    return ApiResponse.ok(res, row, "Election updated");
  });

  static addCandidate = asyncHandler(async (req, res) => {
    const row = await ElectionService.addCandidate(req.body, req.auth.userId, req.requestMeta.requestId);
    return ApiResponse.created(res, row, "Candidate added");
  });

  static listCandidates = asyncHandler(async (req, res) => {
    const rows = await ElectionService.listCandidates(req.params.electionId, {
      scopeToVoter: req.query.scope === "ballot",
      requestingUserId: req.auth?.userId || null,
    });
    return ApiResponse.ok(res, rows, "Election candidates");
  });

  static castVote = asyncHandler(async (req, res) => {
    const row = await ElectionService.castVote(req.body, req.auth.userId, req.requestMeta.requestId);
    return ApiResponse.created(res, row, "Vote cast");
  });

  static results = asyncHandler(async (req, res) => {
    const rows = await ElectionService.getResults(req.params.electionId);
    return ApiResponse.ok(res, rows, "Election results");
  });

  static updatePhase = asyncHandler(async (req, res) => {
    const row = await ElectionService.updatePhase(
      req.params.electionId,
      req.body,
      req.auth.userId,
      req.requestMeta.requestId
    );
    return ApiResponse.ok(res, row, "Election phase updated");
  });

  static validateCandidate = asyncHandler(async (req, res) => {
    const row = await ElectionService.validateCandidate(
      req.params.candidateId,
      req.body.action,
      req.body.reason,
      req.auth.userId,
      req.requestMeta.requestId
    );
    return ApiResponse.ok(res, row, "Candidate validation updated");
  });

  static cancelCandidate = asyncHandler(async (req, res) => {
    const row = await ElectionService.cancelCandidate(
      req.params.candidateId,
      req.body.reason,
      req.auth.userId,
      req.requestMeta.requestId
    );
    return ApiResponse.ok(res, row, "Candidate cancelled");
  });

  static publishResults = asyncHandler(async (req, res) => {
    const data = await ElectionService.publishResults(
      req.params.electionId,
      req.auth.userId,
      req.requestMeta.requestId,
      { autoCreateAppointments: req.body?.autoCreateAppointments !== false }
    );
    return ApiResponse.ok(res, data, "Election results published");
  });

  static getMyVotes = asyncHandler(async (req, res) => {
    const votes = await ElectionService.getMyVotes(req.params.electionId, req.auth.userId);
    return ApiResponse.ok(res, votes, "Your votes");
  });

  // ── Phase 1 per-batch sub-elections ──────────────────────────────────────
  static listBatches = asyncHandler(async (req, res) => {
    const data = await Phase1BatchService.listBatches(req.params.electionId);
    return ApiResponse.ok(res, data, "Phase 1 batch sub-elections");
  });

  static initBatches = asyncHandler(async (req, res) => {
    const data = await Phase1BatchService.initBatches(req.params.electionId, req.body || {}, req.auth.userId, req.requestMeta.requestId);
    return ApiResponse.ok(res, data, "Batches initialized");
  });

  static setBatchStatus = asyncHandler(async (req, res) => {
    const data = await Phase1BatchService.setBatchStatus(req.params.electionId, req.params.batchKey, req.body.status, req.auth.userId, req.requestMeta.requestId);
    return ApiResponse.ok(res, data, "Batch status updated");
  });

  static updateBatch = asyncHandler(async (req, res) => {
    const data = await Phase1BatchService.updateBatch(req.params.electionId, req.params.batchKey, req.body, req.auth.userId, req.requestMeta.requestId);
    return ApiResponse.ok(res, data, "Batch updated");
  });

  static appointBatch = asyncHandler(async (req, res) => {
    const data = await Phase1BatchService.manualAppointBatch(req.params.electionId, req.params.batchKey, req.auth.userId, req.requestMeta.requestId);
    return ApiResponse.ok(res, data, "Batch winners appointed");
  });

  static selfNominate = asyncHandler(async (req, res) => {
    const candidate = await ElectionService.selfNominate(req.params.electionId, req.auth.userId, req.requestMeta.requestId);
    return ApiResponse.created(res, candidate, "Application submitted successfully. Your candidacy is pending Election Commission review.");
  });

  static getVotingStats = asyncHandler(async (req, res) => {
    const stats = await ElectionService.getVotingStats(req.params.electionId);
    return ApiResponse.ok(res, stats, "Voting statistics");
  });
}

module.exports = { ElectionController };
