const { ApiResponse } = require("../core/ApiResponse");
const { asyncHandler } = require("../core/asyncHandler");
const { AdminService } = require("../services/AdminService");

class AdminController {
  // ═══════════════════════════════════════════════════════════════════════════
  // ROLES MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════
  
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

  // ═══════════════════════════════════════════════════════════════════════════
  // TEACHER MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  static listTeachers = asyncHandler(async (req, res) => {
    const items = await AdminService.listTeachers(req.query);
    return ApiResponse.ok(res, items, "Teachers retrieved");
  });

  static getTeacherById = asyncHandler(async (req, res) => {
    const item = await AdminService.getTeacherById(req.params.id);
    return ApiResponse.ok(res, item, "Teacher details");
  });

  static createTeacher = asyncHandler(async (req, res) => {
    const item = await AdminService.createTeacher(req.body, req.auth.userId, req.requestMeta.requestId);
    return ApiResponse.created(res, item, "Teacher created");
  });

  static updateTeacher = asyncHandler(async (req, res) => {
    const item = await AdminService.updateTeacher(req.params.id, req.body, req.auth.userId, req.requestMeta.requestId);
    return ApiResponse.ok(res, item, "Teacher updated");
  });

  static deactivateTeacher = asyncHandler(async (req, res) => {
    const item = await AdminService.deactivateTeacher(req.params.id, req.auth.userId, req.requestMeta.requestId);
    return ApiResponse.ok(res, item, "Teacher deactivated");
  });

  static getTeacherStats = asyncHandler(async (_req, res) => {
    const stats = await AdminService.getTeacherStats();
    return ApiResponse.ok(res, stats, "Teacher statistics");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // STUDENT MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  static listStudents = asyncHandler(async (req, res) => {
    const items = await AdminService.listStudents(req.query);
    return ApiResponse.ok(res, items, "Students retrieved");
  });

  static getStudentById = asyncHandler(async (req, res) => {
    const item = await AdminService.getStudentById(req.params.id);
    return ApiResponse.ok(res, item, "Student details");
  });

  static updateStudentAcademics = asyncHandler(async (req, res) => {
    const item = await AdminService.updateStudentAcademics(req.params.id, req.body, req.auth.userId, req.requestMeta.requestId);
    return ApiResponse.ok(res, item, "Student academics updated");
  });

  static getStudentStats = asyncHandler(async (_req, res) => {
    const stats = await AdminService.getStudentStats();
    return ApiResponse.ok(res, stats, "Student statistics");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EC EXPERIENCE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  static addEcExperience = asyncHandler(async (req, res) => {
    const item = await AdminService.addEcExperience(req.params.id, req.body, req.auth.userId, req.requestMeta.requestId);
    return ApiResponse.created(res, item, "EC experience added");
  });

  static updateEcExperience = asyncHandler(async (req, res) => {
    const item = await AdminService.updateEcExperience(req.params.id, req.params.experienceId, req.body, req.auth.userId, req.requestMeta.requestId);
    return ApiResponse.ok(res, item, "EC experience updated");
  });

  static deleteEcExperience = asyncHandler(async (req, res) => {
    const item = await AdminService.deleteEcExperience(req.params.id, req.params.experienceId, req.auth.userId, req.requestMeta.requestId);
    return ApiResponse.ok(res, item, "EC experience deleted");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ALUMNI MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  static listAlumni = asyncHandler(async (req, res) => {
    const items = await AdminService.listAlumni(req.query);
    return ApiResponse.ok(res, items, "Alumni retrieved");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // USER MANAGEMENT (full CRUD)
  // ═══════════════════════════════════════════════════════════════════════════

  static getUserById = asyncHandler(async (req, res) => {
    const item = await AdminService.getUserById(req.params.id);
    return ApiResponse.ok(res, item, "User details");
  });

  static updateUser = asyncHandler(async (req, res) => {
    const item = await AdminService.updateUser(req.params.id, req.body, req.auth.userId, req.requestMeta.requestId);
    return ApiResponse.ok(res, item, "User updated");
  });

  static deactivateUser = asyncHandler(async (req, res) => {
    const item = await AdminService.deactivateUser(req.params.id, req.auth.userId, req.requestMeta.requestId);
    return ApiResponse.ok(res, item, "User deactivated");
  });

  static changeUserType = asyncHandler(async (req, res) => {
    const item = await AdminService.changeUserType(req.params.id, req.body, req.auth.userId, req.requestMeta.requestId);
    return ApiResponse.ok(res, item, "User type changed");
  });

  static deleteUserCompletely = asyncHandler(async (req, res) => {
    const item = await AdminService.deleteUserCompletely(req.params.id, req.auth.userId, req.requestMeta.requestId);
    return ApiResponse.ok(res, item, "User deleted completely");
  });

  static getAlumniById = asyncHandler(async (req, res) => {
    const item = await AdminService.getAlumniById(req.params.id);
    return ApiResponse.ok(res, item, "Alumni details");
  });

  static verifyUserEmail = asyncHandler(async (req, res) => {
    const item = await AdminService.verifyUserEmail(req.params.id, req.auth.userId, req.requestMeta.requestId);
    return ApiResponse.ok(res, item, "Email verified by admin");
  });
}

module.exports = { AdminController };
