const express = require("express");
const { authenticate } = require("../middleware/auth");
const { NotificationController } = require("../controllers/NotificationController");

const router = express.Router();

router.get("/", authenticate, NotificationController.list);
router.get("/unread-count", authenticate, NotificationController.unreadCount);
router.patch("/read-all", authenticate, NotificationController.markAllRead);
router.patch("/:id/read", authenticate, NotificationController.markRead);

module.exports = { notificationRoutes: router };
