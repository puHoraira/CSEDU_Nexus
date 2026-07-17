const express = require("express");
const { AdminController } = require("../controllers/AdminController");
const { authenticate } = require("../middleware/auth");
const { authorize } = require("../middleware/authorize");
const { validate } = require("../middleware/validate");
const { assignRoleSchema, revokeRoleSchema } = require("../validators/adminValidators");

const router = express.Router();

// ═══════════════════════════════════════════════════════════════════════════
// ROLES MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

router.get("/roles", authenticate, authorize("admin.role.read"), AdminController.listRoles);
router.get("/users", authenticate, authorize("admin.role.read"), AdminController.listUsers);
router.post("/assign-role", authenticate, authorize("admin.role.assign"), validate(assignRoleSchema), AdminController.assignRole);
router.post("/revoke-role", authenticate, authorize("admin.role.revoke"), validate(revokeRoleSchema), AdminController.revokeRole);

// ═══════════════════════════════════════════════════════════════════════════
// TEACHER MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

router.get("/teachers", authenticate, authorize(["System Admin", "Moderator", "Chief Patron"]), AdminController.listTeachers);
router.get("/teachers/stats", authenticate, authorize(["System Admin", "Moderator", "Chief Patron"]), AdminController.getTeacherStats);
router.get("/teachers/:id", authenticate, authorize(["System Admin", "Moderator", "Chief Patron"]), AdminController.getTeacherById);
router.post("/teachers", authenticate, authorize(["System Admin"]), AdminController.createTeacher);
router.put("/teachers/:id", authenticate, authorize(["System Admin"]), AdminController.updateTeacher);
router.delete("/teachers/:id", authenticate, authorize(["System Admin"]), AdminController.deactivateTeacher);

// ═══════════════════════════════════════════════════════════════════════════
// STUDENT MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

router.get("/students", authenticate, authorize(["System Admin", "Moderator", "Chief Patron"]), AdminController.listStudents);
router.get("/students/stats", authenticate, authorize(["System Admin", "Moderator", "Chief Patron"]), AdminController.getStudentStats);
router.get("/students/:id", authenticate, authorize(["System Admin", "Moderator", "Chief Patron"]), AdminController.getStudentById);
router.put("/students/:id/academics", authenticate, authorize(["System Admin", "Moderator"]), AdminController.updateStudentAcademics);

// ═══════════════════════════════════════════════════════════════════════════
// ALUMNI MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

router.get("/alumni", authenticate, authorize(["System Admin", "Moderator", "Chief Patron"]), AdminController.listAlumni);
router.get("/alumni/:id", authenticate, authorize(["System Admin", "Moderator", "Chief Patron"]), AdminController.getAlumniById);

// ═══════════════════════════════════════════════════════════════════════════
// USER MANAGEMENT (cross-type operations)
// ═══════════════════════════════════════════════════════════════════════════

router.get("/users/:id", authenticate, authorize(["System Admin", "Moderator", "Chief Patron"]), AdminController.getUserById);
router.put("/users/:id", authenticate, authorize(["System Admin"]), AdminController.updateUser);
router.delete("/users/:id", authenticate, authorize(["System Admin"]), AdminController.deactivateUser);
router.post("/users/:id/verify-email", authenticate, authorize(["System Admin", "Moderator", "Chief Patron"]), AdminController.verifyUserEmail);
router.put("/users/:id/change-type", authenticate, authorize(["System Admin"]), AdminController.changeUserType);
router.delete("/users/:id/permanent", authenticate, authorize(["System Admin"]), AdminController.deleteUserCompletely);

module.exports = { adminRoutes: router };
