const { ApiResponse } = require("../core/ApiResponse");
const { asyncHandler } = require("../core/asyncHandler");
const { CertificateService } = require("../services/CertificateService");
const { ApiError } = require("../core/ApiError");

class CertificateController {
  static createRequest = asyncHandler(async (req, res) => {
    const item = await CertificateService.createRequest(req.body, req.auth.userId, req.requestMeta.requestId);
    return ApiResponse.created(res, item, "Certificate request created");
  });

  static myRequests = asyncHandler(async (req, res) => {
    const items = await CertificateService.listMyRequests(req.auth.userId);
    return ApiResponse.ok(res, items, "My certificate requests");
  });

  static moderatorInbox = asyncHandler(async (_req, res) => {
    const roles = _req.auth?.roles || [];
    if (!CertificateService.isModerator(roles)) {
      throw new ApiError(403, "Moderator role required");
    }
    const items = await CertificateService.listModeratorInbox();
    return ApiResponse.ok(res, items, "Moderator certificate inbox");
  });

  static chairmanInbox = asyncHandler(async (_req, res) => {
    const roles = _req.auth?.roles || [];
    if (!CertificateService.isChairman(roles)) {
      throw new ApiError(403, "Chairman role required");
    }
    const items = await CertificateService.listChairmanInbox();
    return ApiResponse.ok(res, items, "Chairman certificate inbox");
  });

  static moderatorReview = asyncHandler(async (req, res) => {
    const item = await CertificateService.reviewByModerator(
      req.params.id,
      req.body,
      req.auth.userId,
      req.auth.roles || [],
      req.requestMeta.requestId
    );
    return ApiResponse.ok(res, item, "Certificate reviewed by moderator");
  });

  static chairmanReview = asyncHandler(async (req, res) => {
    const item = await CertificateService.reviewByChairman(
      req.params.id,
      req.body,
      req.auth.userId,
      req.auth.roles || [],
      req.requestMeta.requestId
    );
    return ApiResponse.ok(res, item, "Certificate reviewed by chairman");
  });

  static download = asyncHandler(async (req, res) => {
    const data = await CertificateService.buildDownloadText(
      req.params.id,
      req.auth.userId,
      req.auth.roles || [],
      req.requestMeta.requestId
    );

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=\"${data.filename}\"`);
    return res.status(200).send(data.text);
  });
}

module.exports = { CertificateController };
