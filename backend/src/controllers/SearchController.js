const { SearchService } = require("../services/SearchService");
const { asyncHandler } = require("../core/asyncHandler");
const { ApiResponse } = require("../core/ApiResponse");

class SearchController {
  /**
   * Global search across all entities
   * GET /api/v1/search?q=query&categories=users,events&limit=20
   */
  static globalSearch = asyncHandler(async (req, res) => {
    const userId = req.auth.userId;
    const { q, categories, limit } = req.query;

    const categoryList = categories ? categories.split(",") : undefined;
    const limitNum = limit ? parseInt(limit) : undefined;

    const results = await SearchService.globalSearch(q, userId, {
      categories: categoryList,
      limit: limitNum,
    });

    return ApiResponse.ok(res, results, "Search completed successfully");
  });

  /**
   * Quick search for users (autocomplete)
   * GET /api/v1/search/users?q=query&limit=10
   */
  static quickSearchUsers = asyncHandler(async (req, res) => {
    const userId = req.auth.userId;
    const { q, limit } = req.query;

    const limitNum = limit ? parseInt(limit) : undefined;

    const results = await SearchService.quickSearchUsers(q, userId, limitNum);

    return ApiResponse.ok(res, results, "User search completed successfully");
  });
}

module.exports = { SearchController };
