const { ApiResponse } = require("../core/ApiResponse");
const { asyncHandler } = require("../core/asyncHandler");
const { AdminDashboardService } = require("../services/AdminDashboardService");

class AdminDashboardController {
  static getDashboardStats = asyncHandler(async (_req, res) => {
    const stats = await AdminDashboardService.getDashboardStats();
    return ApiResponse.ok(res, stats, "Dashboard statistics");
  });

  static getSystemHealth = asyncHandler(async (_req, res) => {
    const health = await AdminDashboardService.getSystemHealth();
    return ApiResponse.ok(res, health, "System health metrics");
  });

  static getQuickStats = asyncHandler(async (_req, res) => {
    const stats = await AdminDashboardService.getQuickStats();
    return ApiResponse.ok(res, stats, "Quick statistics");
  });

  static searchUsers = asyncHandler(async (req, res) => {
    const results = await AdminDashboardService.searchUsers(req.query);
    return ApiResponse.ok(res, results, "User search results");
  });

  static getUserDetails = asyncHandler(async (req, res) => {
    const details = await AdminDashboardService.getUserDetails(req.params.userId);
    return ApiResponse.ok(res, details, "User details");
  });
}

module.exports = { AdminDashboardController };
