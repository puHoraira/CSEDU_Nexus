const { UserProfileService } = require("../services/UserProfileService");
const { asyncHandler } = require("../core/asyncHandler");
const { ApiResponse } = require("../core/ApiResponse");

class UserProfileController {
  /**
   * Get user profile by ID
   * GET /api/users/:userId/profile
   */
  static getProfile = asyncHandler(async (req, res) => {
    const requestingUserId = req.auth.userId;
    const { userId } = req.params;

    const profile = await UserProfileService.getUserProfile(userId, requestingUserId);

    return ApiResponse.ok(res, profile, "Profile retrieved successfully");
  });

  /**
   * Search users
   * GET /api/users/search
   */
  static searchUsers = asyncHandler(async (req, res) => {
    const { q, limit, roles } = req.query;
    const requestingUserId = req.auth.userId;

    const users = await UserProfileService.searchUsers(q, {
      limit: parseInt(limit) || 20,
      excludeUserId: requestingUserId,
      roles: roles ? roles.split(",") : null,
    });

    return ApiResponse.ok(res, users, "Users retrieved successfully");
  });

  /**
   * Get user directory
   * GET /api/users/directory
   */
  static getDirectory = asyncHandler(async (req, res) => {
    const requestingUserId = req.auth.userId;
    const { page, limit, roles, batch, year } = req.query;

    const result = await UserProfileService.getUserDirectory(requestingUserId, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50,
      filter: {
        roles: roles ? roles.split(",") : null,
        batch: batch ? parseInt(batch) : null,
        year: year,
      },
    });

    return ApiResponse.ok(res, result, "User directory retrieved successfully");
  });

  /**
   * Update own profile
   * PATCH /api/users/profile
   */
  static updateOwnProfile = asyncHandler(async (req, res) => {
    const userId = req.auth.userId;

    const user = await UserProfileService.updateOwnProfile(userId, req.body);

    return ApiResponse.ok(res, user, "Profile updated successfully");
  });
}

module.exports = { UserProfileController };
