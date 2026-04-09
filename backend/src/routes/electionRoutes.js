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
router.post(
  "/candidates",
  authenticate,
  authorize("election.candidate.add"),
  validate(addCandidateSchema),
  ElectionController.addCandidate
);
router.get(
  "/:electionId/candidates",
  authenticate,
  authorize("election.read"),
  ElectionController.listCandidates
);
router.patch(
  "/:electionId/phase",
  authenticate,
  authorize("election.commission.manage"),
  validate(updateElectionPhaseSchema),
  ElectionController.updatePhase
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
router.post("/votes", authenticate, authorize("election.vote.cast"), validate(castVoteSchema), ElectionController.castVote);
router.get("/:electionId/results", authenticate, ElectionController.results);
router.post(
  "/:electionId/publish-results",
  authenticate,
  authorize("election.results.publish"),
  ElectionController.publishResults
);

module.exports = { electionRoutes: router };
