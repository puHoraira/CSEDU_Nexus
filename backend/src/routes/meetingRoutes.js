const express = require("express");
const { MeetingController } = require("../controllers/MeetingController");
const { authenticate } = require("../middleware/auth");
const { authorize } = require("../middleware/authorize");
const { validate } = require("../middleware/validate");
const { createMeetingSchema, recordAttendanceSchema } = require("../validators/meetingValidators");

const router = express.Router();

router.get("/", authenticate, authorize("meeting.read"), MeetingController.list);
router.post("/", authenticate, authorize("meeting.create"), validate(createMeetingSchema), MeetingController.create);
router.post(
  "/attendance",
  authenticate,
  authorize("meeting.attendance.record"),
  validate(recordAttendanceSchema),
  MeetingController.attendance
);
router.post("/absence-alerts", authenticate, authorize("meeting.attendance.read"), MeetingController.absenceAlerts);

module.exports = { meetingRoutes: router };
