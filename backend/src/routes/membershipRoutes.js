const express = require("express");
const { MembershipController } = require("../controllers/MembershipController");
const { authenticate } = require("../middleware/auth");
const { authorize } = require("../middleware/authorize");
const { validate } = require("../middleware/validate");
const {
  createCancellationSchema,
  reviewCancellationSchema,
  directCancelMembershipSchema,
} = require("../validators/membershipValidators");
const { z } = require("zod");

const router = express.Router();

const yearCorrectionRequestSchema = z.object({
  requestedYear: z.number().int().min(1).max(5),
  reason: z.string().min(5).max(500),
});

const reviewYearCorrectionSchema = z.object({
  action: z.enum(["Approved", "Rejected"]),
  reviewNote: z.string().max(500).optional(),
});

router.get("/members", authenticate, authorize("membership.read"), MembershipController.listMembers);
router.get("/members/me", authenticate, MembershipController.getSelf);
router.get(
  "/cancellations",
  authenticate,
  authorize("membership.cancellation.review"),
  MembershipController.listCancellations
);

router.post(
  "/cancellations",
  authenticate,
  authorize("membership.cancellation.request"),
  validate(createCancellationSchema),
  MembershipController.createCancellation
);

router.patch(
  "/cancellations/:id/review",
  authenticate,
  authorize("membership.cancellation.review"),
  validate(reviewCancellationSchema),
  MembershipController.reviewCancellation
);

router.patch(
  "/cancellations/:id/execute",
  authenticate,
  authorize("membership.cancellation.execute"),
  MembershipController.executeCancellation
);

router.patch("/members/:id/issue", authenticate, authorize("membership.issue"), MembershipController.issueMembership);
router.patch(
  "/members/:id/cancel",
  authenticate,
  authorize("membership.cancel"),
  validate(directCancelMembershipSchema),
  MembershipController.cancelMembershipDirect
);
router.patch(
  "/members/:id/grant-alumni",
  authenticate,
  authorize("governance.override"),
  MembershipController.grantAlumniRole
);

// Year correction routes
router.post(
  "/year-correction",
  authenticate,
  validate(yearCorrectionRequestSchema),
  MembershipController.requestYearCorrection
);
router.get(
  "/year-corrections/pending",
  authenticate,
  authorize("governance.proposal.approve"),
  MembershipController.listPendingYearCorrectionRequests
);
router.patch(
  "/year-corrections/:id/review",
  authenticate,
  authorize("governance.proposal.approve"),
  validate(reviewYearCorrectionSchema),
  MembershipController.reviewYearCorrectionRequest
);

module.exports = { membershipRoutes: router };
