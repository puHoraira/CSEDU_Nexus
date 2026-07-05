const express = require("express");
const { AdminController } = require("../controllers/AdminController");
const { AdminDashboardController } = require("../controllers/AdminDashboardController");
const { authenticate } = require("../middleware/auth");
const { authorize } = require("../middleware/authorize");
const { validate } = require("../middleware/validate");
const { assignRoleSchema, revokeRoleSchema } = require("../validators/adminValidators");

const router = express.Router();

// Dashboard & Stats
router.get("/dashboard/stats", authenticate, authorize("admin.role.read"), AdminDashboardController.getDashboardStats);
router.get("/dashboard/health", authenticate, authorize("admin.role.read"), AdminDashboardController.getSystemHealth);
router.get("/dashboard/quick-stats", authenticate, authorize("admin.role.read"), AdminDashboardController.getQuickStats);

// User Management
router.get("/users/search", authenticate, authorize("admin.role.read"), AdminDashboardController.searchUsers);
router.get("/users/:userId/details", authenticate, authorize("admin.role.read"), AdminDashboardController.getUserDetails);

// Role Management
router.get("/roles", authenticate, authorize("admin.role.read"), AdminController.listRoles);
router.get("/users", authenticate, authorize("admin.role.read"), AdminController.listUsers);
router.post("/assign-role", authenticate, authorize("admin.role.assign"), validate(assignRoleSchema), AdminController.assignRole);
router.post("/revoke-role", authenticate, authorize("admin.role.revoke"), validate(revokeRoleSchema), AdminController.revokeRole);

module.exports = { adminRoutes: router };
