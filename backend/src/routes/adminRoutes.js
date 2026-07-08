const express = require("express");
const { AdminController } = require("../controllers/AdminController");
const { authenticate } = require("../middleware/auth");
const { authorize } = require("../middleware/authorize");
const { validate } = require("../middleware/validate");
const { assignRoleSchema, revokeRoleSchema } = require("../validators/adminValidators");

const router = express.Router();

router.get("/roles", authenticate, authorize("admin.role.read"), AdminController.listRoles);
router.get("/users", authenticate, authorize("admin.role.read"), AdminController.listUsers);
router.post("/assign-role", authenticate, authorize("admin.role.assign"), validate(assignRoleSchema), AdminController.assignRole);
router.post("/revoke-role", authenticate, authorize("admin.role.revoke"), validate(revokeRoleSchema), AdminController.revokeRole);

module.exports = { adminRoutes: router };
