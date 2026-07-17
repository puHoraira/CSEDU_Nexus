const { ApiResponse } = require("../core/ApiResponse");
const { asyncHandler } = require("../core/asyncHandler");
const { GovernanceService } = require("../services/GovernanceService");

class GovernanceController {
  static getConstitution = asyncHandler(async (_req, res) => {
    const item = await GovernanceService.getCurrentConstitution();
    return ApiResponse.ok(res, item, "Active constitution");
  });

  static listConstitutionVersions = asyncHandler(async (_req, res) => {
    const items = await GovernanceService.listConstitutionVersions();
    return ApiResponse.ok(res, items, "Constitution versions");
  });

  static saveConstitution = asyncHandler(async (req, res) => {
    const item = await GovernanceService.saveConstitution(req.body, req.auth.userId, req.requestMeta.requestId);
    return ApiResponse.created(res, item, "Constitution saved");
  });

  static updateConstitutionArticle = asyncHandler(async (req, res) => {
    const item = await GovernanceService.updateActiveConstitutionArticle(
      req.params.order,
      req.body,
      req.auth.userId,
      req.requestMeta.requestId
    );
    return ApiResponse.ok(res, item, "Constitution article updated");
  });

  static createProposal = asyncHandler(async (req, res) => {
    const item = await GovernanceService.createProposal(req.body, req.auth.userId, req.requestMeta.requestId);
    return ApiResponse.created(res, item, "Governance proposal created");
  });

  static listProposals = asyncHandler(async (_req, res) => {
    const items = await GovernanceService.listProposals();
    return ApiResponse.ok(res, items, "Governance proposals");
  });

  static moderatorReviewProposal = asyncHandler(async (req, res) => {
    const item = await GovernanceService.reviewProposal(
      req.params.id,
      "Moderator",
      req.body.action,
      req.body.comment,
      req.auth.userId,
      req.requestMeta.requestId
    );
    return ApiResponse.ok(res, item, "Proposal reviewed by moderator");
  });

  static chiefPatronReviewProposal = asyncHandler(async (req, res) => {
    const item = await GovernanceService.reviewProposal(
      req.params.id,
      "Chief Patron",
      req.body.action,
      req.body.comment,
      req.auth.userId,
      req.requestMeta.requestId
    );
    return ApiResponse.ok(res, item, "Proposal reviewed by Chief Patron");
  });

  static listTerms = asyncHandler(async (_req, res) => {
    const items = await GovernanceService.listTerms();
    return ApiResponse.ok(res, items, "EC terms");
  });

  static createPost = asyncHandler(async (req, res) => {
    const item = await GovernanceService.createPost(req.body, req.auth.userId, req.requestMeta.requestId);
    return ApiResponse.created(res, item, "EC post created");
  });

  static listPosts = asyncHandler(async (_req, res) => {
    const items = await GovernanceService.listPosts();
    return ApiResponse.ok(res, items, "EC posts");
  });

  static listAppointments = asyncHandler(async (_req, res) => {
    const items = await GovernanceService.listAppointments();
    return ApiResponse.ok(res, items, "EC appointments");
  });

  static createTerm = asyncHandler(async (req, res) => {
    const payload = {
      ...req.body,
      startsOn: new Date(req.body.startsOn),
      endsOn: new Date(req.body.endsOn),
    };
    const item = await GovernanceService.createTerm(payload, req.auth.userId, req.requestMeta.requestId);
    return ApiResponse.created(res, item, "EC term created");
  });

  static updateTerm = asyncHandler(async (req, res) => {
    const payload = { ...req.body };
    if (req.body.startsOn) payload.startsOn = new Date(req.body.startsOn);
    if (req.body.endsOn) payload.endsOn = new Date(req.body.endsOn);
    const item = await GovernanceService.updateTerm(req.params.id, payload, req.auth.userId, req.requestMeta.requestId);
    return ApiResponse.ok(res, item, "EC term updated");
  });

  static deleteTerm = asyncHandler(async (req, res) => {
    const result = await GovernanceService.deleteTerm(req.params.id, req.auth.userId, req.requestMeta.requestId);
    return ApiResponse.ok(res, result, "EC term deleted");
  });

  static appointMember = asyncHandler(async (req, res) => {
    const payload = { ...req.body, startsOn: new Date(req.body.startsOn) };
    const item = await GovernanceService.appointMember(payload, req.auth.userId, req.requestMeta.requestId);
    return ApiResponse.created(res, item, "EC member appointed");
  });

  static deleteAppointment = asyncHandler(async (req, res) => {
    const result = await GovernanceService.deleteAppointment(req.params.id, req.auth.userId, req.requestMeta.requestId);
    return ApiResponse.ok(res, result, "EC appointment deleted");
  });
}

module.exports = { GovernanceController };
