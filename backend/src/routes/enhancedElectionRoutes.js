const express = require("express");
const { EnhancedElectionController } = require("../controllers/EnhancedElectionController");
const { enhancedElectionValidators } = require("../validators/enhancedElectionValidators");
const { validate } = require("../middleware/validate");
const { authenticate } = require("../middleware/auth");
const { authorize } = require("../middleware/authorize");

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Election Management Routes
router.post(
  "/",
  authorize(["Moderator", "Chief Patron", "Chairman"]),
  validate(enhancedElectionValidators.createElection),
  EnhancedElectionController.create
);

router.get(
  "/",
  validate(enhancedElectionValidators.listElections, "query"),
  EnhancedElectionController.list
);

router.get(
  "/:electionId",
  validate(enhancedElectionValidators.electionId, "params"),
  EnhancedElectionController.getById
);

router.put(
  "/:electionId",
  authorize(["Moderator", "Chief Patron", "Chairman"]),
  validate(enhancedElectionValidators.electionId, "params"),
  validate(enhancedElectionValidators.updateElection),
  EnhancedElectionController.update
);

// Election Commission Routes
router.post(
  "/:electionId/commission",
  authorize(["Chief Patron", "Chairman"]),
  validate(enhancedElectionValidators.electionId, "params"),
  validate(enhancedElectionValidators.createCommission),
  EnhancedElectionController.createCommission
);

router.get(
  "/:electionId/commission",
  validate(enhancedElectionValidators.electionId, "params"),
  EnhancedElectionController.getCommission
);

router.put(
  "/:electionId/commission/config",
  authorize(["Moderator", "Chief Patron", "Chairman"]),
  validate(enhancedElectionValidators.electionId, "params"),
  validate(enhancedElectionValidators.updateCommissionConfig),
  EnhancedElectionController.updateCommissionConfig
);

// Candidate Management Routes
router.post(
  "/candidates",
  validate(enhancedElectionValidators.submitCandidateApplication),
  EnhancedElectionController.submitCandidateApplication
);

router.get(
  "/:electionId/candidates",
  validate(enhancedElectionValidators.electionId, "params"),
  validate(enhancedElectionValidators.listCandidates, "query"),
  EnhancedElectionController.listCandidates
);

router.get(
  "/candidates/:candidateId",
  validate(enhancedElectionValidators.candidateId, "params"),
  EnhancedElectionController.getCandidateById
);

router.put(
  "/candidates/:candidateId",
  validate(enhancedElectionValidators.candidateId, "params"),
  validate(enhancedElectionValidators.updateCandidateApplication),
  EnhancedElectionController.updateCandidateApplication
);

router.post(
  "/candidates/:candidateId/withdraw",
  validate(enhancedElectionValidators.candidateId, "params"),
  validate(enhancedElectionValidators.withdrawCandidateApplication),
  EnhancedElectionController.withdrawCandidateApplication
);

// Commission Review Routes
router.post(
  "/candidates/:candidateId/review",
  authorize(["Moderator", "Chief Patron", "Chairman"]),
  validate(enhancedElectionValidators.candidateId, "params"),
  validate(enhancedElectionValidators.reviewCandidateApplication),
  EnhancedElectionController.reviewCandidateApplication
);

// Voting Routes
router.post(
  "/vote",
  validate(enhancedElectionValidators.castVote),
  EnhancedElectionController.castVote
);

router.get(
  "/:electionId/voting-status",
  validate(enhancedElectionValidators.electionId, "params"),
  EnhancedElectionController.getVotingStatus
);

// Election Phase Management
router.put(
  "/:electionId/phase",
  authorize(["Moderator", "Chief Patron", "Chairman"]),
  validate(enhancedElectionValidators.electionId, "params"),
  validate(enhancedElectionValidators.updateElectionPhase),
  EnhancedElectionController.updateElectionPhase
);

// Results Routes
router.get(
  "/:electionId/results",
  validate(enhancedElectionValidators.electionId, "params"),
  validate(enhancedElectionValidators.getResults, "query"),
  EnhancedElectionController.getResults
);

router.post(
  "/:electionId/publish-results",
  authorize(["Moderator", "Chief Patron", "Chairman"]),
  validate(enhancedElectionValidators.electionId, "params"),
  validate(enhancedElectionValidators.publishResults),
  EnhancedElectionController.publishResults
);

router.get(
  "/:electionId/statistics",
  validate(enhancedElectionValidators.electionId, "params"),
  EnhancedElectionController.getElectionStatistics
);

// Commission Announcements
router.post(
  "/:electionId/announcements",
  authorize(["Moderator", "Chief Patron", "Chairman"]),
  validate(enhancedElectionValidators.electionId, "params"),
  validate(enhancedElectionValidators.createAnnouncement),
  EnhancedElectionController.createAnnouncement
);

router.get(
  "/:electionId/announcements",
  validate(enhancedElectionValidators.electionId, "params"),
  EnhancedElectionController.getAnnouncements
);

// Dispute Management
router.post(
  "/disputes",
  validate(enhancedElectionValidators.createDispute),
  EnhancedElectionController.createDispute
);

router.get(
  "/:electionId/disputes",
  validate(enhancedElectionValidators.electionId, "params"),
  validate(enhancedElectionValidators.getDisputes, "query"),
  EnhancedElectionController.getDisputes
);

// Utility Routes
router.get(
  "/utils/eligible-batches",
  EnhancedElectionController.getEligibleBatches
);

router.get(
  "/utils/active-posts",
  EnhancedElectionController.getActivePosts
);

router.get(
  "/utils/active-terms",
  EnhancedElectionController.getActiveTerms
);

// Legacy Routes for Backward Compatibility
router.post(
  "/add-candidate",
  validate(enhancedElectionValidators.submitCandidateApplication),
  EnhancedElectionController.addCandidate
);

router.post(
  "/candidates/:candidateId/validate",
  authorize(["Moderator", "Chief Patron", "Chairman"]),
  validate(enhancedElectionValidators.candidateId, "params"),
  EnhancedElectionController.validateCandidate
);

router.post(
  "/candidates/:candidateId/cancel",
  authorize(["Moderator", "Chief Patron", "Chairman"]),
  validate(enhancedElectionValidators.candidateId, "params"),
  validate(enhancedElectionValidators.withdrawCandidateApplication),
  EnhancedElectionController.cancelCandidate
);

router.put(
  "/:electionId/update-phase",
  authorize(["Moderator", "Chief Patron", "Chairman"]),
  validate(enhancedElectionValidators.electionId, "params"),
  validate(enhancedElectionValidators.updateElectionPhase),
  EnhancedElectionController.updatePhase
);

module.exports = router;