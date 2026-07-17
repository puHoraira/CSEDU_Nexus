const express = require("express");
const { GovernanceController } = require("../controllers/GovernanceController");
const { authenticate } = require("../middleware/auth");
const { authorize } = require("../middleware/authorize");
const { validate } = require("../middleware/validate");
const {
  createEcPostSchema,
  createEcTermSchema,
  updateEcTermSchema,
  appointEcMemberSchema,
  createProposalSchema,
  reviewProposalSchema,
  saveConstitutionSchema,
  updateConstitutionArticleSchema,
} = require("../validators/governanceValidators");

const router = express.Router();

router.get("/constitution", GovernanceController.getConstitution);
router.get("/ec-posts", authenticate, GovernanceController.listPosts);
router.get(
  "/constitution/versions",
  authenticate,
  authorize("governance.proposal.approve"),
  GovernanceController.listConstitutionVersions
);
router.post(
  "/constitution",
  authenticate,
  authorize("governance.proposal.approve"),
  validate(saveConstitutionSchema),
  GovernanceController.saveConstitution
);
router.patch(
  "/constitution/articles/:order",
  authenticate,
  authorize("governance.proposal.approve"),
  validate(updateConstitutionArticleSchema),
  GovernanceController.updateConstitutionArticle
);
router.get("/ec-terms", authenticate, authorize("governance.ecTerm.create"), GovernanceController.listTerms);
router.get("/ec-appointments", authenticate, GovernanceController.listAppointments);
router.get("/proposals", authenticate, GovernanceController.listProposals);
router.post(
  "/proposals",
  authenticate,
  authorize("governance.constitution.change.convene"),
  validate(createProposalSchema),
  GovernanceController.createProposal
);
router.patch(
  "/proposals/:id/moderator-review",
  authenticate,
  authorize("governance.proposal.approve"),
  validate(reviewProposalSchema),
  GovernanceController.moderatorReviewProposal
);
router.patch(
  "/proposals/:id/chief-patron-review",
  authenticate,
  authorize("governance.constitution.change.approve"),
  validate(reviewProposalSchema),
  GovernanceController.chiefPatronReviewProposal
);
router.post(
  "/ec-posts",
  authenticate,
  authorize("governance.ecPost.create"),
  validate(createEcPostSchema),
  GovernanceController.createPost
);

router.post(
  "/ec-terms",
  authenticate,
  authorize("governance.ecTerm.create"),
  validate(createEcTermSchema),
  GovernanceController.createTerm
);

router.patch(
  "/ec-terms/:id",
  authenticate,
  authorize("governance.ecTerm.create"),
  validate(updateEcTermSchema),
  GovernanceController.updateTerm
);

router.delete(
  "/ec-terms/:id",
  authenticate,
  authorize("governance.ecTerm.create"),
  GovernanceController.deleteTerm
);

router.post(
  "/ec-appointments",
  authenticate,
  authorize("governance.ecAppointment.create"),
  validate(appointEcMemberSchema),
  GovernanceController.appointMember
);

router.delete(
  "/ec-appointments/:id",
  authenticate,
  authorize("governance.ecAppointment.create"),
  GovernanceController.deleteAppointment
);

module.exports = { governanceRoutes: router };
