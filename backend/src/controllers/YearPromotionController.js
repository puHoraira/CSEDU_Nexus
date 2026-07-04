const { YearPromotionService } = require("../services/YearPromotionService");
const { asyncHandler } = require("../core/asyncHandler");
const { ApiResponse } = require("../core/ApiResponse");
const { ApiError } = require("../core/ApiError");

class YearPromotionController {
  /**
   * GET /api/v1/year-promotion/preview/:yearLevel
   * Get promotion preview for a specific year level
   */
  static getPromotionPreview = asyncHandler(async (req, res) => {
    const { yearLevel } = req.params;

    const preview = await YearPromotionService.getPromotionPreview(yearLevel);

    return res
      .status(200)
      .json(new ApiResponse(200, preview, "Promotion preview retrieved successfully"));
  });

  /**
   * POST /api/v1/year-promotion/bulk-promote
   * Bulk promote all students in a year level
   */
  static bulkPromoteYear = asyncHandler(async (req, res) => {
    const { yearLevel, excludeRetained = true, notes = '' } = req.body;

    if (!yearLevel) {
      throw new ApiError(400, "Year level is required");
    }

    const result = await YearPromotionService.bulkPromoteYear(
      yearLevel,
      req.user._id,
      excludeRetained,
      notes
    );

    return res
      .status(200)
      .json(new ApiResponse(200, result, `Successfully promoted ${result.successCount} students`));
  });

  /**
   * POST /api/v1/year-promotion/promote/:memberId
   * Promote individual student
   */
  static promoteIndividualStudent = asyncHandler(async (req, res) => {
    const { memberId } = req.params;
    const { notes = '' } = req.body;

    const result = await YearPromotionService.promoteIndividualStudent(
      memberId,
      req.user._id,
      notes
    );

    return res
      .status(200)
      .json(new ApiResponse(200, result, "Student promoted successfully"));
  });

  /**
   * POST /api/v1/year-promotion/retain/:memberId
   * Retain student in current year (mark as failed)
   */
  static retainStudent = asyncHandler(async (req, res) => {
    const { memberId } = req.params;
    const { reason = '' } = req.body;

    const result = await YearPromotionService.retainStudent(
      memberId,
      req.user._id,
      reason
    );

    return res
      .status(200)
      .json(new ApiResponse(200, result, "Student retention status updated"));
  });

  /**
   * POST /api/v1/year-promotion/clear-retention/:memberId
   * Clear retention status for a student
   */
  static clearRetentionStatus = asyncHandler(async (req, res) => {
    const { memberId } = req.params;
    const { reason = '' } = req.body;

    const result = await YearPromotionService.clearRetentionStatus(
      memberId,
      req.user._id,
      reason
    );

    return res
      .status(200)
      .json(new ApiResponse(200, result, "Retention status cleared successfully"));
  });

  /**
   * GET /api/v1/year-promotion/stats
   * Get year-wise student statistics
   */
  static getYearWiseStats = asyncHandler(async (req, res) => {
    const stats = await YearPromotionService.getYearWiseStats();

    return res
      .status(200)
      .json(new ApiResponse(200, stats, "Year-wise statistics retrieved successfully"));
  });

  /**
   * POST /api/v1/year-promotion/rollback/:memberId
   * Rollback last promotion for a student
   */
  static rollbackPromotion = asyncHandler(async (req, res) => {
    const { memberId } = req.params;
    const { reason = '' } = req.body;

    const result = await YearPromotionService.rollbackPromotion(
      memberId,
      req.user._id,
      reason
    );

    return res
      .status(200)
      .json(new ApiResponse(200, result, "Promotion rollback successful"));
  });
}

module.exports = { YearPromotionController };
