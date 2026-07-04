const { AdminMemberManagementService } = require("../services/AdminMemberManagementService");
const { asyncHandler } = require("../core/asyncHandler");
const { ApiResponse } = require("../core/ApiResponse");
const { ApiError } = require("../core/ApiError");

class AdminMemberController {
  /**
   * GET /api/v1/admin/members
   * Get all members with pagination and filters
   */
  static getAllMembers = asyncHandler(async (req, res) => {
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50,
      search: req.query.search || '',
      yearLevel: req.query.yearLevel || '',
      membershipStatus: req.query.membershipStatus || '',
      batch: req.query.batch || '',
      sortBy: req.query.sortBy || 'createdAt',
      sortOrder: req.query.sortOrder || 'desc',
      includeAlumni: req.query.includeAlumni !== 'false'
    };

    const result = await AdminMemberManagementService.getAllMembers(options);

    return res
      .status(200)
      .json(new ApiResponse(200, result, "Members retrieved successfully"));
  });

  /**
   * GET /api/v1/admin/members/:memberId
   * Get detailed member information
   */
  static getMemberDetails = asyncHandler(async (req, res) => {
    const { memberId } = req.params;

    const member = await AdminMemberManagementService.getMemberDetails(memberId);

    return res
      .status(200)
      .json(new ApiResponse(200, member, "Member details retrieved successfully"));
  });

  /**
   * GET /api/v1/admin/members/search/:searchTerm
   * Search members by name, email, or student ID
   */
  static searchMembers = asyncHandler(async (req, res) => {
    const { searchTerm } = req.params;
    const limit = parseInt(req.query.limit) || 20;

    if (!searchTerm || searchTerm.length < 2) {
      throw new ApiError(400, "Search term must be at least 2 characters");
    }

    const members = await AdminMemberManagementService.searchMembers(searchTerm, limit);

    return res
      .status(200)
      .json(new ApiResponse(200, members, "Search results"));
  });

  /**
   * GET /api/v1/admin/members/alumni/list
   * Get alumni members with filters
   */
  static getAlumniMembers = asyncHandler(async (req, res) => {
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50,
      graduatedYear: req.query.graduatedYear || '',
      employmentStatus: req.query.employmentStatus || '',
      industry: req.query.industry || '',
      willingToMentor: req.query.willingToMentor || null,
      sortBy: req.query.sortBy || 'alumniInfo.graduatedYear',
      sortOrder: req.query.sortOrder || 'desc'
    };

    const result = await AdminMemberManagementService.getAlumniMembers(options);

    return res
      .status(200)
      .json(new ApiResponse(200, result, "Alumni members retrieved successfully"));
  });

  /**
   * GET /api/v1/admin/members/statistics
   * Get member statistics for dashboard
   */
  static getMemberStatistics = asyncHandler(async (req, res) => {
    const stats = await AdminMemberManagementService.getMemberStatistics();

    return res
      .status(200)
      .json(new ApiResponse(200, stats, "Statistics retrieved successfully"));
  });

  /**
   * PATCH /api/v1/admin/members/:memberId
   * Update member information
   */
  static updateMemberInfo = asyncHandler(async (req, res) => {
    const { memberId } = req.params;
    const updates = req.body;
    const updatedBy = req.user._id;

    const member = await AdminMemberManagementService.updateMemberInfo(
      memberId,
      updates,
      updatedBy
    );

    return res
      .status(200)
      .json(new ApiResponse(200, member, "Member information updated successfully"));
  });

  /**
   * GET /api/v1/admin/members/export
   * Export members data (CSV)
   */
  static exportMembersData = asyncHandler(async (req, res) => {
    const filters = {
      yearLevel: req.query.yearLevel || '',
      membershipStatus: req.query.membershipStatus || ''
    };

    const data = await AdminMemberManagementService.exportMembersData(filters);

    return res
      .status(200)
      .json(new ApiResponse(200, data, "Members data exported successfully"));
  });
}

module.exports = { AdminMemberController };
