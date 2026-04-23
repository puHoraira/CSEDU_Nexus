const { ApiResponse } = require("../core/ApiResponse");
const { asyncHandler } = require("../core/asyncHandler");
const { NotificationService } = require("../services/NotificationService");

class NotificationController {
  static list = asyncHandler(async (req, res) => {
    const data = await NotificationService.listForUser(req.auth.userId, req.query);
    return ApiResponse.ok(res, data, "Notifications");
  });

  static unreadCount = asyncHandler(async (req, res) => {
    const data = await NotificationService.getUnreadCount(req.auth.userId);
    return ApiResponse.ok(res, data, "Notification unread count");
  });

  static markRead = asyncHandler(async (req, res) => {
    const item = await NotificationService.markAsRead(req.params.id, req.auth.userId);
    return ApiResponse.ok(res, item, "Notification marked as read");
  });

  static markAllRead = asyncHandler(async (req, res) => {
    const data = await NotificationService.markAllAsRead(req.auth.userId);
    return ApiResponse.ok(res, data, "Notifications marked as read");
  });
}

module.exports = { NotificationController };
