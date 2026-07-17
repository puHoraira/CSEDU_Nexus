const express = require("express");
const { ElectionController } = require("../controllers/ElectionController");
const { authenticate } = require("../middleware/auth");
const { authorize } = require("../middleware/authorize");
const { validate } = require("../middleware/validate");
const {
  createElectionSchema,
  addCandidateSchema,
  castVoteSchema,
  updateElectionPhaseSchema,
  validateCandidateSchema,
  cancelCandidateSchema,
} = require("../validators/electionValidators");

const router = express.Router();

router.get("/", authenticate, authorize("election.read"), ElectionController.list);
router.post("/", authenticate, authorize("election.create"), validate(createElectionSchema), ElectionController.create);

// Specific candidate routes BEFORE /:id to avoid conflicts
router.post(
  "/candidates",
  authenticate,
  authorize("election.candidate.add"),
  validate(addCandidateSchema),
  ElectionController.addCandidate
);
router.patch(
  "/candidates/:candidateId/validate",
  authenticate,
  authorize("election.candidate.validate"),
  validate(validateCandidateSchema),
  ElectionController.validateCandidate
);
router.patch(
  "/candidates/:candidateId/cancel",
  authenticate,
  authorize("election.candidate.cancel"),
  validate(cancelCandidateSchema),
  ElectionController.cancelCandidate
);

// Vote routes
router.post("/votes", authenticate, authorize("election.vote.cast"), validate(castVoteSchema), ElectionController.castVote);

// Election-specific routes
router.get("/:electionId/candidates", authenticate, authorize("election.read"), ElectionController.listCandidates);
router.post("/:electionId/self-nominate", authenticate, ElectionController.selfNominate); // Any authenticated user can self-nominate
router.patch("/:electionId/phase", authenticate, authorize("election.commission.manage"), validate(updateElectionPhaseSchema), ElectionController.updatePhase);
router.get("/:electionId/my-votes", authenticate, ElectionController.getMyVotes);
router.get("/:electionId/results", authenticate, ElectionController.results);
router.post("/:electionId/publish-results", authenticate, authorize("election.results.publish"), ElectionController.publishResults);

// Phase 1 per-batch sub-elections
router.get("/:electionId/batches", authenticate, authorize("election.read"), ElectionController.listBatches);
router.post("/:electionId/batches/init", authenticate, authorize("election.commission.manage"), ElectionController.initBatches);
router.patch("/:electionId/batches/:batchKey/status", authenticate, authorize("election.commission.manage"), ElectionController.setBatchStatus);
router.patch("/:electionId/batches/:batchKey", authenticate, authorize("election.commission.manage"), ElectionController.updateBatch);
router.post("/:electionId/batches/:batchKey/appoint", authenticate, authorize("election.results.publish"), ElectionController.appointBatch);

// Generic get by ID LAST to avoid catching other routes
router.get("/:id", authenticate, authorize("election.read"), ElectionController.get);

module.exports = { electionRoutes: router };
