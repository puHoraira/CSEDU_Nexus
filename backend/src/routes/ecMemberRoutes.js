const express = require("express");
const { EcMemberController } = require("../controllers/EcMemberController");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// Public routes (authenticated users can view)
router.get("/current", authenticate, EcMemberController.getCurrentEcMembers);
router.get("/terms", authenticate, EcMemberController.getAllEcTerms);
router.get("/term/:termId", authenticate, EcMemberController.getEcMembersByTerm);
router.get("/past", authenticate, EcMemberController.getPastEcMembers);
router.get("/statistics", authenticate, EcMemberController.getEcStatistics);
router.get("/member/:memberId/history", authenticate, EcMemberController.getMemberEcHistory);
router.get("/search/:searchTerm", authenticate, EcMemberController.searchEcMembers);

module.exports = { ecMemberRoutes: router };
