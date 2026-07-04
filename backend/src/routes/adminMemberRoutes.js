const express = require("express");
const { AdminMemberController } = require("../controllers/AdminMemberController");
const { authenticate } = require("../middleware/auth");
const { authorize } = require("../middleware/authorize");

const router = express.Router();

// All routes require authentication and moderator/admin privileges
router.use(authenticate);
router.use(authorize(["Moderator", "Chief Patron", "President"]));

// Get member statistics
router.get("/statistics", AdminMemberController.getMemberStatistics);

// Search members
router.get("/search/:searchTerm", AdminMemberController.searchMembers);

// Get alumni members
router.get("/alumni/list", AdminMemberController.getAlumniMembers);

// Export members data
router.get("/export", AdminMemberController.exportMembersData);

// Get all members with filters
router.get("/", AdminMemberController.getAllMembers);

// Get member details
router.get("/:memberId", AdminMemberController.getMemberDetails);

// Update member information
router.patch("/:memberId", AdminMemberController.updateMemberInfo);

module.exports = { adminMemberRoutes: router };
