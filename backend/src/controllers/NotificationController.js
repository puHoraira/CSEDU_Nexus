const { ApiResponse } = require("../core/ApiResponse");
const { asyncHandler } = require("../core/asyncHandler");
const { NotificationService } = require("../services/NotificationService");
const { NotificationTargetingService } = require("../services/NotificationTargetingService");
const { ApiError } = require("../core/ApiError");
const jwt = require("jsonwebtoken");
const { env } = require("../config/env");
const { User } = require("../models/User");

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

  /**
   * GET /api/v1/notifications/stream  (Server-Sent Events)
   * EventSource cannot send Authorization headers, so the access token is
   * accepted via the `token` query param and verified here.
   */
  static stream = asyncHandler(async (req, res) => {
    const token = req.query.token || (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!token) throw new ApiError(401, "Authentication required");

    let userId;
    try {
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
      const user = await User.findById(payload.sub).select("_id isActive");
      if (!user || !user.isActive) throw new ApiError(401, "Invalid authentication state");
      userId = user._id.toString();
    } catch (_err) {
      throw new ApiError(401, "Invalid or expired token");
    }

    await NotificationService.openStream(req, res, userId);
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
    const senderId = req.auth.userId;
    const senderRole = (req.auth.roles || [])[0] || "";
    const result = await NotificationTargetingService.sendGeneralNotification({ ...req.body, senderRole }, senderId);

    return res
      .status(200)
      .json(new ApiResponse(200, result, "General notification sent successfully"));
  });

  /**
   * POST /api/v1/notifications/send/year-wise
   * Send notification to specific year levels
   */
  static sendYearWiseNotification = asyncHandler(async (req, res) => {
    const senderId = req.auth.userId;
    const senderRole = (req.auth.roles || [])[0] || "";
    const result = await NotificationTargetingService.sendYearWiseNotification({ ...req.body, senderRole }, senderId);

    return res
      .status(200)
      .json(new ApiResponse(200, result, "Year-wise notification sent successfully"));
  });

  /**
   * POST /api/v1/notifications/send/members
   * Send notification to specific members
   */
  static sendMemberSpecificNotification = asyncHandler(async (req, res) => {
    const senderId = req.auth.userId;
    const senderRole = (req.auth.roles || [])[0] || "";
    const result = await NotificationTargetingService.sendMemberSpecificNotification({ ...req.body, senderRole }, senderId);

    return res
      .status(200)
      .json(new ApiResponse(200, result, "Member-specific notification sent successfully"));
  });

  /**
   * POST /api/v1/notifications/send/individual
   * Send notification to individual user
   */
  static sendIndividualNotification = asyncHandler(async (req, res) => {
    const senderId = req.auth.userId;
    const senderRole = (req.auth.roles || [])[0] || "";
    const result = await NotificationTargetingService.sendIndividualNotification({ ...req.body, senderRole }, senderId);

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
    const senderId = req.query.myNotifications === 'true' ? req.auth.userId : null;
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
