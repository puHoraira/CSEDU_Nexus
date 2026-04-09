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

const router = express.Router();

router.get("/members", authenticate, authorize("membership.read"), MembershipController.listMembers);
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

module.exports = { membershipRoutes: router };
