const express = require("express");
const { MeetingController } = require("../controllers/MeetingController");
const { authenticate } = require("../middleware/auth");
const { authorize } = require("../middleware/authorize");
const { validate } = require("../middleware/validate");
const { createMeetingSchema, recordAttendanceSchema } = require("../validators/meetingValidators");

const router = express.Router();

// List and detail
router.get("/", authenticate, authorize("meeting.read"), MeetingController.list);
router.get("/:id", authenticate, authorize("meeting.read"), MeetingController.detail);

// Create and update
router.post("/", authenticate, authorize("meeting.create"), validate(createMeetingSchema), MeetingController.create);
router.patch("/:id", authenticate, authorize("meeting.update"), MeetingController.update);

// Meeting lifecycle
router.post("/:id/start", authenticate, authorize("meeting.manage"), MeetingController.start);
router.post("/:id/complete", authenticate, authorize("meeting.manage"), MeetingController.complete);
router.post("/:id/cancel", authenticate, authorize("meeting.manage"), MeetingController.cancel);
router.post("/:id/postpone", authenticate, authorize("meeting.manage"), MeetingController.postpone);

// Attendance
router.get("/:id/attendance", authenticate, authorize("meeting.attendance.read"), MeetingController.getMeetingAttendance);
router.post("/:id/attendance", authenticate, authorize("meeting.attendance.record"), MeetingController.recordAttendance);
router.post("/:id/attendance/bulk", authenticate, authorize("meeting.attendance.record"), MeetingController.recordBulkAttendance);
router.get("/attendance/my-history", authenticate, MeetingController.getUserAttendanceHistory);

// Agenda
router.post("/:id/agenda", authenticate, authorize("meeting.manage"), MeetingController.addAgendaItem);
router.patch("/:id/agenda/:agendaItemId", authenticate, authorize("meeting.manage"), MeetingController.updateAgendaItem);

// Decisions and attachments
router.post("/:id/decisions", authenticate, authorize("meeting.manage"), MeetingController.addDecision);
router.post("/:id/attachments", authenticate, authorize("meeting.manage"), MeetingController.addAttachment);

// Alerts and reports
router.post("/absence-alerts", authenticate, authorize("meeting.attendance.read"), MeetingController.absenceAlerts);

// Online meeting
router.get("/:id/zego-kit-token", authenticate, authorize("meeting.read"), MeetingController.zegoKitToken);

// Legacy endpoint for backward compatibility
router.post(
  "/attendance",
  authenticate,
  authorize("meeting.attendance.record"),
  validate(recordAttendanceSchema),
  MeetingController.attendance
);

module.exports = { meetingRoutes: router };
