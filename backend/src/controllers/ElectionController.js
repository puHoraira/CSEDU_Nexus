const { ApiResponse } = require("../core/ApiResponse");
const { asyncHandler } = require("../core/asyncHandler");
const { ElectionService } = require("../services/ElectionService");

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

  static list = asyncHandler(async (_req, res) => {
    const rows = await ElectionService.listElections();
    return ApiResponse.ok(res, rows, "Elections");
  });

  static get = asyncHandler(async (req, res) => {
    const row = await ElectionService.getElection(req.params.id);
    return ApiResponse.ok(res, row, "Election details");
  });

  static addCandidate = asyncHandler(async (req, res) => {
    const row = await ElectionService.addCandidate(req.body, req.auth.userId, req.requestMeta.requestId);
    return ApiResponse.created(res, row, "Candidate added");
  });

  static listCandidates = asyncHandler(async (req, res) => {
    const rows = await ElectionService.listCandidates(req.params.electionId);
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
    console.log('=== UPDATE PHASE CONTROLLER ===');
    console.log('Params:', req.params);
    console.log('Body:', req.body);
    console.log('User:', req.auth.userId);
    
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
    const data = await ElectionService.publishResults(req.params.electionId, req.auth.userId, req.requestMeta.requestId);
    return ApiResponse.ok(res, data, "Election results published");
  });

  static getMyVotes = asyncHandler(async (req, res) => {
    const votes = await ElectionService.getMyVotes(req.params.electionId, req.auth.userId);
    return ApiResponse.ok(res, votes, "Your votes");
  });
}

module.exports = { ElectionController };
