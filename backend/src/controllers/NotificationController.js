const { ApiResponse } = require("../core/ApiResponse");
const { asyncHandler } = require("../core/asyncHandler");
const { NotificationService } = require("../services/NotificationService");
const { NotificationTargetingService } = require("../services/NotificationTargetingService");
const { ApiError } = require("../core/ApiError");

class NotificationController {
  // User notification endpoints (existing)
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

  // Admin notification targeting endpoints (new)
  
  /**
   * POST /api/v1/notifications/send/general
   * Send notification to all active members
   */
  static sendGeneralNotification = asyncHandler(async (req, res) => {
    const senderId = req.user._id;
    const result = await NotificationTargetingService.sendGeneralNotification(req.body, senderId);

    return res
      .status(200)
      .json(new ApiResponse(200, result, "General notification sent successfully"));
  });

  /**
   * POST /api/v1/notifications/send/year-wise
   * Send notification to specific year levels
   */
  static sendYearWiseNotification = asyncHandler(async (req, res) => {
    const senderId = req.user._id;
    const result = await NotificationTargetingService.sendYearWiseNotification(req.body, senderId);

    return res
      .status(200)
      .json(new ApiResponse(200, result, "Year-wise notification sent successfully"));
  });

  /**
   * POST /api/v1/notifications/send/members
   * Send notification to specific members
   */
  static sendMemberSpecificNotification = asyncHandler(async (req, res) => {
    const senderId = req.user._id;
    const result = await NotificationTargetingService.sendMemberSpecificNotification(req.body, senderId);

    return res
      .status(200)
      .json(new ApiResponse(200, result, "Member-specific notification sent successfully"));
  });

  /**
   * POST /api/v1/notifications/send/individual
   * Send notification to individual user
   */
  static sendIndividualNotification = asyncHandler(async (req, res) => {
    const senderId = req.user._id;
    const result = await NotificationTargetingService.sendIndividualNotification(req.body, senderId);

    return res
      .status(200)
      .json(new ApiResponse(200, result, "Individual notification sent successfully"));
  });

  /**
   * POST /api/v1/notifications/preview
   * Get preview of notification recipients
   */
  static getNotificationPreview = asyncHandler(async (req, res) => {
    const { targetType, targetData } = req.body;

    if (!targetType) {
      throw new ApiError(400, "Target type is required");
    }

    const result = await NotificationTargetingService.getNotificationPreview(targetType, targetData);

    return res
      .status(200)
      .json(new ApiResponse(200, result, "Notification preview"));
  });

  /**
   * GET /api/v1/notifications/batch/:batchId
   * Get batch notification status
   */
  static getBatchStatus = asyncHandler(async (req, res) => {
    const { batchId } = req.params;
    const result = await NotificationTargetingService.getBatchNotificationStatus(batchId);

    return res
      .status(200)
      .json(new ApiResponse(200, result, "Batch notification status"));
  });

  /**
   * GET /api/v1/notifications/statistics
   * Get notification statistics
   */
  static getStatistics = asyncHandler(async (req, res) => {
    const senderId = req.query.myNotifications === 'true' ? req.user._id : null;
    const result = await NotificationTargetingService.getNotificationStatistics(senderId);

    return res
      .status(200)
      .json(new ApiResponse(200, result, "Notification statistics"));
  });

  /**
   * POST /api/v1/notifications/send-scheduled
   * Trigger scheduled notifications (for cron job)
   */
  static sendScheduledNotifications = asyncHandler(async (req, res) => {
    const result = await NotificationTargetingService.sendScheduledNotifications();

    return res
      .status(200)
      .json(new ApiResponse(200, result, "Scheduled notifications processed"));
  });

  /**
   * POST /api/v1/notifications/expire-old
   * Expire old notifications (for cron job)
   */
  static expireOldNotifications = asyncHandler(async (req, res) => {
    const result = await NotificationTargetingService.expireOldNotifications();

    return res
      .status(200)
      .json(new ApiResponse(200, result, "Old notifications expired"));
  });
}

module.exports = { NotificationController };
