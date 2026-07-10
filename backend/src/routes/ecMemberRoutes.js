const express = require("express");
const { EcMemberController } = require("../controllers/EcMemberController");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// Public routes (no authentication required)
router.get("/current", EcMemberController.getCurrentEcMembers);
router.get("/terms", EcMemberController.getAllEcTerms);
router.get("/term/:termId", EcMemberController.getEcMembersByTerm);
router.get("/past", EcMemberController.getPastEcMembers);
router.get("/statistics", EcMemberController.getEcStatistics);
router.get("/member/:memberId/history", EcMemberController.getMemberEcHistory);
router.get("/search/:searchTerm", EcMemberController.searchEcMembers);

module.exports = { ecMemberRoutes: router };
