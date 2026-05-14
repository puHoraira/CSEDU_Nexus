const { ApiResponse } = require("../core/ApiResponse");
const { asyncHandler } = require("../core/asyncHandler");
const { MembershipService } = require("../services/MembershipService");

class MembershipController {
  static listMembers = asyncHandler(async (_req, res) => {
    const items = await MembershipService.listMembers();
    return ApiResponse.ok(res, items, "Members");
  });

  static listCancellations = asyncHandler(async (_req, res) => {
    const items = await MembershipService.listCancellationRequests();
    return ApiResponse.ok(res, items, "Membership cancellations");
  });

  static createCancellation = asyncHandler(async (req, res) => {
    const item = await MembershipService.createCancellationRequest(req.body, req.auth.userId, req.requestMeta.requestId);
    return ApiResponse.created(res, item, "Cancellation request created");
  });

  static reviewCancellation = asyncHandler(async (req, res) => {
    const approverRoles = ["President", "Moderator", "Chief Patron"];
    const roleName = (req.auth.roles || []).find((role) => approverRoles.includes(role));
    if (!roleName) {
      return res.status(403).json({ success: false, message: "No approver role found for current user" });
    }

    const item = await MembershipService.reviewCancellationRequest(
      req.params.id,
      roleName,
      req.auth.userId,
      req.body.action,
      req.body.comment,
      req.requestMeta.requestId
    );
    return ApiResponse.ok(res, item, "Cancellation reviewed");
  });

  static executeCancellation = asyncHandler(async (req, res) => {
    const item = await MembershipService.executeApprovedCancellation(req.params.id, req.auth.userId, req.requestMeta.requestId);
    return ApiResponse.ok(res, item, "Membership cancelled");
  });

  static issueMembership = asyncHandler(async (req, res) => {
    const item = await MembershipService.issueMembership(req.params.id, req.auth.userId, req.requestMeta.requestId);
    return ApiResponse.ok(res, item, "Membership issued");
  });

  static cancelMembershipDirect = asyncHandler(async (req, res) => {
    const item = await MembershipService.cancelMembershipDirect(
      req.params.id,
      req.auth.userId,
      req.body.reason,
      req.requestMeta.requestId
    );
    return ApiResponse.ok(res, item, "Membership cancelled directly");
  });

  static grantAlumniRole = asyncHandler(async (req, res) => {
    const item = await MembershipService.grantAlumniRole(req.params.id, req.auth.userId, req.requestMeta.requestId);
    return ApiResponse.ok(res, item, "Alumni role granted");
  });

  // Year correction requests
  static requestYearCorrection = asyncHandler(async (req, res) => {
    const item = await MembershipService.requestYearCorrection(
      req.auth.userId,
      req.body.requestedYear,
      req.body.reason,
      req.requestMeta.requestId
    );
    return ApiResponse.created(res, item, "Year correction request submitted");
  });

  static listPendingYearCorrectionRequests = asyncHandler(async (_req, res) => {
    const items = await MembershipService.listPendingYearCorrectionRequests();
    return ApiResponse.ok(res, items, "Pending year correction requests");
  });

  static reviewYearCorrectionRequest = asyncHandler(async (req, res) => {
    const item = await MembershipService.reviewYearCorrectionRequest(
      req.params.id,
      req.auth.userId,
      req.body.action,
      req.body.reviewNote,
      req.requestMeta.requestId
    );
    return ApiResponse.ok(res, item, `Year correction request ${req.body.action.toLowerCase()}`);
  });
}

module.exports = { MembershipController };
