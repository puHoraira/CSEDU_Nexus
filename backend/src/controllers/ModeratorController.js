const { ApiResponse } = require("../core/ApiResponse");
const { asyncHandler } = require("../core/asyncHandler");
const { ModeratorService } = require("../services/ModeratorService");

class ModeratorController {
  static details = asyncHandler(async (req, res) => {
    const data = await ModeratorService.getModeratorDetails(req.auth.userId);
    return ApiResponse.ok(res, data, "Moderator details");
  });

  static listElectionCommissioners = asyncHandler(async (_req, res) => {
    const data = await ModeratorService.listElectionCommissioners();
    return ApiResponse.ok(res, data, "Election commissioners");
  });

  static assignElectionCommissioner = asyncHandler(async (req, res) => {
    const data = await ModeratorService.assignElectionCommissioner(
      req.body.userId,
      req.auth.userId,
      req.requestMeta.requestId
    );
    return ApiResponse.ok(res, data, "Election commissioner assigned");
  });

  static revokeElectionCommissioner = asyncHandler(async (req, res) => {
    const data = await ModeratorService.revokeElectionCommissioner(
      req.params.userId,
      req.auth.userId,
      req.requestMeta.requestId
    );
    return ApiResponse.ok(res, data, "Election commissioner revoked");
  });

  static bulkRegisterFromCsv = asyncHandler(async (req, res) => {
    const data = await ModeratorService.bulkRegisterFromCsv(
      req.body.csvContent,
      req.auth.userId,
      req.requestMeta.requestId
    );
    return ApiResponse.ok(res, data, "CSV bulk registration completed");
  });
}

module.exports = { ModeratorController };