const express = require("express");
const { EcMemberController } = require("../controllers/EcMemberController");
const { authenticate } = require("../middleware/auth");
const { authorize } = require("../middleware/authorize");

const router = express.Router();

// Public routes (no authentication required)
router.get("/current", EcMemberController.getCurrentEcMembers);
router.get("/terms", EcMemberController.getAllEcTerms);
router.get("/term/:termId", EcMemberController.getEcMembersByTerm);
router.get("/past", EcMemberController.getPastEcMembers);
router.get("/statistics", EcMemberController.getEcStatistics);
router.get("/member/:memberId/history", EcMemberController.getMemberEcHistory);
router.get("/search/:searchTerm", EcMemberController.searchEcMembers);

// Protected routes - Term Management (requires authentication and authorization)
router.use(authenticate);

// Get single term details
router.get("/terms/:termId", EcMemberController.getTermById);

// Get term statistics
router.get("/terms/:termId/statistics", EcMemberController.getTermStatistics);

// Create, update, and delete terms (Moderator and above only)
router.post(
  "/terms",
  authorize(["Moderator", "Chief Patron", "Chairman"]),
  EcMemberController.createTerm
);

router.put(
  "/terms/:termId",
  authorize(["Moderator", "Chief Patron", "Chairman"]),
  EcMemberController.updateTerm
);

router.delete(
  "/terms/:termId",
  authorize(["Moderator", "Chief Patron", "Chairman"]),
  EcMemberController.deleteTerm
);

module.exports = { ecMemberRoutes: router };
