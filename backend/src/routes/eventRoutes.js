const express = require("express");
const { EventController } = require("../controllers/EventController");
const { authenticate, optionalAuthenticate } = require("../middleware/auth");
const { authorize } = require("../middleware/authorize");
const { validate } = require("../middleware/validate");
const { createEventSchema, updateEventSchema, volunteerSchema } = require("../validators/eventValidators");
const {
  volunteerApplySchema,
  reviewVolunteerSchema,
  createEventPostSchema,
  createEventCommentSchema,
} = require("../validators/eventValidators");

const router = express.Router();

router.get("/", optionalAuthenticate, EventController.list);
router.get("/:id", optionalAuthenticate, EventController.detail);
router.get("/:id/feed", EventController.feed);
router.post("/", authenticate, authorize("event.create"), validate(createEventSchema), EventController.create);
router.patch("/:id", authenticate, authorize("event.create"), validate(updateEventSchema), EventController.update);

// Follow/Unfollow events
router.post("/:id/follow", authenticate, EventController.followEvent);
router.delete("/:id/follow", authenticate, EventController.unfollowEvent);

// Volunteer eligibility check
router.get("/:id/volunteer-eligibility", authenticate, EventController.checkVolunteerEligibility);

// Posts and comments
router.post("/:id/posts", authenticate, validate(createEventPostSchema), EventController.createPost);
router.post("/:id/posts/:postId/comments", authenticate, validate(createEventCommentSchema), EventController.commentOnPost);

// Volunteers
router.get(
  "/:id/volunteers",
  authenticate,
  authorize("event.volunteer.manage"),
  EventController.listVolunteers
);
router.post(
  "/:id/volunteer-applications",
  authenticate,
  authorize("event.volunteer.register"),
  validate(volunteerApplySchema),
  EventController.applyVolunteer
);
router.patch(
  "/volunteers/:id/review",
  authenticate,
  authorize("event.volunteer.manage"),
  validate(reviewVolunteerSchema),
  EventController.reviewVolunteer
);
router.post(
  "/volunteers",
  authenticate,
  authorize("event.volunteer.register"),
  validate(volunteerSchema),
  EventController.volunteer
);

module.exports = { eventRoutes: router };
