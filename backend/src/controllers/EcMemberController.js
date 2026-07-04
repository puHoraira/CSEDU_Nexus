const { EcMemberService } = require("../services/EcMemberService");
const { asyncHandler } = require("../core/asyncHandler");
const { ApiResponse } = require("../core/ApiResponse");

class EcMemberController {
  /**
   * GET /api/v1/ec-members/current
   * Get current EC members
   */
  static getCurrentEcMembers = asyncHandler(async (req, res) => {
    const result = await EcMemberService.getCurrentEcMembers();

    return res
      .status(200)
      .json(new ApiResponse(200, result, "Current EC members retrieved successfully"));
  });

  /**
   * GET /api/v1/ec-members/term/:termId
   * Get EC members by term
   */
  static getEcMembersByTerm = asyncHandler(async (req, res) => {
    const { termId } = req.params;
    const result = await EcMemberService.getEcMembersByTerm(termId);

    return res
      .status(200)
      .json(new ApiResponse(200, result, "EC members retrieved successfully"));
  });

  /**
   * GET /api/v1/ec-members/terms
   * Get all EC terms
   */
  static getAllEcTerms = asyncHandler(async (req, res) => {
    const terms = await EcMemberService.getAllEcTerms();

    return res
      .status(200)
      .json(new ApiResponse(200, terms, "EC terms retrieved successfully"));
  });

  /**
   * GET /api/v1/ec-members/member/:memberId/history
   * Get EC history for a member
   */
  static getMemberEcHistory = asyncHandler(async (req, res) => {
    const { memberId } = req.params;
    const history = await EcMemberService.getMemberEcHistory(memberId);

    return res
      .status(200)
      .json(new ApiResponse(200, history, "EC history retrieved successfully"));
  });

  /**
   * GET /api/v1/ec-members/past
   * Get past EC members
   */
  static getPastEcMembers = asyncHandler(async (req, res) => {
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50,
      sortBy: req.query.sortBy || 'endsOn',
      sortOrder: req.query.sortOrder || 'desc'
    };

    const result = await EcMemberService.getPastEcMembers(options);

    return res
      .status(200)
      .json(new ApiResponse(200, result, "Past EC members retrieved successfully"));
  });

  /**
   * GET /api/v1/ec-members/statistics
   * Get EC statistics
   */
  static getEcStatistics = asyncHandler(async (req, res) => {
    const stats = await EcMemberService.getEcStatistics();

    return res
      .status(200)
      .json(new ApiResponse(200, stats, "EC statistics retrieved successfully"));
  });

  /**
   * GET /api/v1/ec-members/search/:searchTerm
   * Search EC members
   */
  static searchEcMembers = asyncHandler(async (req, res) => {
    const { searchTerm } = req.params;
    const results = await EcMemberService.searchEcMembers(searchTerm);

    return res
      .status(200)
      .json(new ApiResponse(200, results, "Search results"));
  });
}

module.exports = { EcMemberController };
