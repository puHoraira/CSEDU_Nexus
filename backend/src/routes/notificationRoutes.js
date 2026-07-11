const express = require("express");
const { authenticate } = require("../middleware/auth");

const { authorize } = require("../middleware/authorize");
const { NotificationController } = require("../controllers/NotificationController");

const router = express.Router();

// Real-time stream (SSE). Auth via ?token= query since EventSource can't set headers.
router.get("/stream", NotificationController.stream);

// User notification endpoints (public for authenticated users)
router.get("/", authenticate, NotificationController.list);
router.get("/unread-count", authenticate, NotificationController.unreadCount);
router.patch("/read-all", authenticate, NotificationController.markAllRead);
router.patch("/:id/read", authenticate, NotificationController.markRead);

// Admin notification targeting endpoints (require moderator/admin)
router.post(
  "/send/general",
  authenticate,
  authorize(["Moderator", "Chief Patron", "President"]),
  NotificationController.sendGeneralNotification
);

router.post(
  "/send/year-wise",
  authenticate,
  authorize(["Moderator", "Chief Patron", "President"]),
  NotificationController.sendYearWiseNotification
);

router.post(
  "/send/members",
  authenticate,
  authorize(["Moderator", "Chief Patron", "President"]),
  NotificationController.sendMemberSpecificNotification
);

router.post(
  "/send/individual",
  authenticate,
  authorize(["Moderator", "Chief Patron", "President"]),
  NotificationController.sendIndividualNotification
);

router.post(
  "/preview",
  authenticate,
  authorize(["Moderator", "Chief Patron", "President"]),
  NotificationController.getNotificationPreview
);

router.get(
  "/batch/:batchId",
  authenticate,
  authorize(["Moderator", "Chief Patron", "President"]),
  NotificationController.getBatchStatus
);

router.get(
  "/statistics",
  authenticate,
  authorize(["Moderator", "Chief Patron", "President"]),
  NotificationController.getStatistics
);

// Cron job endpoints (should be protected by API key or internal access only)
router.post("/send-scheduled", NotificationController.sendScheduledNotifications);
router.post("/expire-old", NotificationController.expireOldNotifications);

module.exports = { notificationRoutes: router };
