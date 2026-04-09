const { ApiResponse } = require("../core/ApiResponse");
const { asyncHandler } = require("../core/asyncHandler");
const { AdminService } = require("../services/AdminService");

class AdminController {
  static listRoles = asyncHandler(async (_req, res) => {
    const items = await AdminService.listRoles();
    return ApiResponse.ok(res, items, "Roles");
  });

  static listUsers = asyncHandler(async (_req, res) => {
    const items = await AdminService.listUsersWithRoles();
    return ApiResponse.ok(res, items, "Users with roles");
  });

  static assignRole = asyncHandler(async (req, res) => {
    const item = await AdminService.assignRole(req.body.userId, req.body.roleName, req.auth.userId, req.requestMeta.requestId);
    return ApiResponse.ok(res, item, "Role assigned");
  });

  static revokeRole = asyncHandler(async (req, res) => {
    const item = await AdminService.revokeRole(req.body.userId, req.body.roleName, req.auth.userId, req.requestMeta.requestId);
    return ApiResponse.ok(res, item, "Role revoked");
  });
}

module.exports = { AdminController };
