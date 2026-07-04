const { Notification } = require("../models/Notification");
const { Member } = require("../models/Member");
const { User } = require("../models/User");
const { ApiError } = require("../core/ApiError");
const { v4: uuidv4 } = require("uuid");

class NotificationTargetingService {
  /**
   * Send general notification to all active members
   */
  static async sendGeneralNotification(payload, senderId) {
    const {
      title,
      message,
      category = "General",
      priority = "Normal",
      actionUrl = "",
      scheduledFor = null,
      expiresAt = null
    } = payload;

    // Get all active members
    const members = await Member.find({
      'membershipStatus.status': { $in: ['Active', 'Inactive'] }
    })
      .populate('userId', '_id')
      .select('userId')
      .lean();

    const batchId = uuidv4();
    const notifications = [];

    for (const member of members) {
      if (member.userId) {
        notifications.push({
          recipientUserId: member.userId._id,
          title,
          message,
          category,
          priority,
          actionUrl,
          targetType: "General",
          targetYears: ["All_Years"],
          sentBy: senderId,
          batchId,
          totalRecipients: members.length,
          scheduledFor,
          isSent: !scheduledFor,
          sentAt: !scheduledFor ? new Date() : null,
          expiresAt
        });
      }
    }

    const createdNotifications = await Notification.insertMany(notifications);

    return {
      batchId,
      totalRecipients: members.length,
      notifications: createdNotifications,
      message: `Notification sent to ${members.length} members`
    };
  }

  /**
   * Send year-wise notification to specific year levels
   */
  static async sendYearWiseNotification(payload, senderId) {
    const {
      title,
      message,
      category = "Announcement",
      priority = "Normal",
      actionUrl = "",
      targetYears = [],
      scheduledFor = null,
      expiresAt = null
    } = payload;

    if (!targetYears || targetYears.length === 0) {
      throw new ApiError(400, "Target years are required for year-wise notifications");
    }

    // Get members by year levels
    const members = await Member.find({
      academicYearLevel: { $in: targetYears },
      'membershipStatus.status': { $in: ['Active', 'Inactive'] }
    })
      .populate('userId', '_id')
      .select('userId academicYearLevel')
      .lean();

    if (members.length === 0) {
      throw new ApiError(404, `No members found for year levels: ${targetYears.join(', ')}`);
    }

    const batchId = uuidv4();
    const notifications = [];

    for (const member of members) {
      if (member.userId) {
        notifications.push({
          recipientUserId: member.userId._id,
          title,
          message,
          category,
          priority,
          actionUrl,
          targetType: "Year_Wise",
          targetYears,
          sentBy: senderId,
          batchId,
          totalRecipients: members.length,
          scheduledFor,
          isSent: !scheduledFor,
          sentAt: !scheduledFor ? new Date() : null,
          expiresAt
        });
      }
    }

    const createdNotifications = await Notification.insertMany(notifications);

    return {
      batchId,
      targetYears,
      totalRecipients: members.length,
      notifications: createdNotifications,
      message: `Notification sent to ${members.length} members in ${targetYears.join(', ')}`
    };
  }

  /**
   * Send notification to specific members
   */
  static async sendMemberSpecificNotification(payload, senderId) {
    const {
      title,
      message,
      category = "System",
      priority = "Normal",
      actionUrl = "",
      targetMembers = [],
      scheduledFor = null,
      expiresAt = null
    } = payload;

    if (!targetMembers || targetMembers.length === 0) {
      throw new ApiError(400, "Target members are required");
    }

    // Get members by IDs
    const members = await Member.find({
      _id: { $in: targetMembers }
    })
      .populate('userId', '_id')
      .select('userId')
      .lean();

    if (members.length === 0) {
      throw new ApiError(404, "No valid members found");
    }

    const batchId = uuidv4();
    const notifications = [];

    for (const member of members) {
      if (member.userId) {
        notifications.push({
          recipientUserId: member.userId._id,
          title,
          message,
          category,
          priority,
          actionUrl,
          targetType: "Custom_Group",
          targetMembers,
          sentBy: senderId,
          batchId,
          totalRecipients: members.length,
          scheduledFor,
          isSent: !scheduledFor,
          sentAt: !scheduledFor ? new Date() : null,
          expiresAt
        });
      }
    }

    const createdNotifications = await Notification.insertMany(notifications);

    return {
      batchId,
      totalRecipients: members.length,
      notifications: createdNotifications,
      message: `Notification sent to ${members.length} selected members`
    };
  }

  /**
   * Send individual notification (existing functionality)
   */
  static async sendIndividualNotification(payload, senderId) {
    const {
      recipientUserId,
      title,
      message,
      category = "System",
      priority = "Normal",
      actionUrl = "",
      entityType = "",
      entityId = "",
      metadata = {},
      scheduledFor = null,
      expiresAt = null
    } = payload;

    if (!recipientUserId) {
      throw new ApiError(400, "Recipient user ID is required");
    }

    const notification = await Notification.create({
      recipientUserId,
      title,
      message,
      category,
      priority,
      actionUrl,
      entityType,
      entityId,
      metadata,
      targetType: "Individual",
      sentBy: senderId,
      batchId: uuidv4(),
      totalRecipients: 1,
      scheduledFor,
      isSent: !scheduledFor,
      sentAt: !scheduledFor ? new Date() : null,
      expiresAt
    });

    return notification;
  }

  /**
   * Get notification preview (count of recipients)
   */
  static async getNotificationPreview(targetType, targetData) {
    let count = 0;
    let details = {};

    switch (targetType) {
      case "General":
        count = await Member.countDocuments({
          'membershipStatus.status': { $in: ['Active', 'Inactive'] }
        });
        details = { type: "All active members" };
        break;

      case "Year_Wise":
        if (!targetData.targetYears || targetData.targetYears.length === 0) {
          throw new ApiError(400, "Target years required for preview");
        }
        count = await Member.countDocuments({
          academicYearLevel: { $in: targetData.targetYears },
          'membershipStatus.status': { $in: ['Active', 'Inactive'] }
        });
        
        // Get breakdown by year
        const yearBreakdown = await Member.aggregate([
          {
            $match: {
              academicYearLevel: { $in: targetData.targetYears },
              'membershipStatus.status': { $in: ['Active', 'Inactive'] }
            }
          },
          {
            $group: {
              _id: '$academicYearLevel',
              count: { $sum: 1 }
            }
          }
        ]);
        
        details = {
          type: "Year-wise",
          targetYears: targetData.targetYears,
          breakdown: yearBreakdown.map(y => ({
            year: y._id,
            count: y.count
          }))
        };
        break;

      case "Custom_Group":
        if (!targetData.targetMembers || targetData.targetMembers.length === 0) {
          throw new ApiError(400, "Target members required for preview");
        }
        count = await Member.countDocuments({
          _id: { $in: targetData.targetMembers }
        });
        details = {
          type: "Custom group",
          selectedMembers: targetData.targetMembers.length
        };
        break;

      case "Individual":
        count = 1;
        details = { type: "Individual user" };
        break;

      default:
        throw new ApiError(400, "Invalid target type");
    }

    return {
      targetType,
      totalRecipients: count,
      details
    };
  }

  /**
   * Get batch notification status
   */
  static async getBatchNotificationStatus(batchId) {
    const notifications = await Notification.find({ batchId });

    if (notifications.length === 0) {
      throw new ApiError(404, "Batch not found");
    }

    const total = notifications.length;
    const delivered = notifications.filter(n => n.isSent).length;
    const read = notifications.filter(n => n.isRead).length;
    const pending = notifications.filter(n => !n.isSent).length;

    return {
      batchId,
      totalRecipients: total,
      deliveredCount: delivered,
      readCount: read,
      pendingCount: pending,
      deliveryRate: ((delivered / total) * 100).toFixed(2) + '%',
      readRate: ((read / total) * 100).toFixed(2) + '%',
      sentAt: notifications[0]?.sentAt,
      targetType: notifications[0]?.targetType,
      title: notifications[0]?.title
    };
  }

  /**
   * Send scheduled notifications (to be called by cron job)
   */
  static async sendScheduledNotifications() {
    const now = new Date();

    const scheduledNotifications = await Notification.find({
      scheduledFor: { $lte: now },
      isSent: false
    });

    let sentCount = 0;

    for (const notification of scheduledNotifications) {
      notification.isSent = true;
      notification.sentAt = now;
      await notification.save();
      sentCount++;
    }

    return {
      sentCount,
      message: `Sent ${sentCount} scheduled notifications`
    };
  }

  /**
   * Expire old notifications (to be called by cron job)
   */
  static async expireOldNotifications() {
    const now = new Date();

    const result = await Notification.updateMany(
      {
        expiresAt: { $lte: now },
        isExpired: false
      },
      {
        isExpired: true
      }
    );

    return {
      expiredCount: result.modifiedCount,
      message: `Expired ${result.modifiedCount} notifications`
    };
  }

  /**
   * Get notification statistics
   */
  static async getNotificationStatistics(senderId = null) {
    const query = senderId ? { sentBy: senderId } : {};

    const [
      totalSent,
      totalRead,
      totalPending,
      batchStats,
      priorityStats,
      categoryStats
    ] = await Promise.all([
      Notification.countDocuments({ ...query, isSent: true }),
      Notification.countDocuments({ ...query, isRead: true }),
      Notification.countDocuments({ ...query, isSent: false }),
      
      Notification.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$targetType',
            count: { $sum: 1 },
            readCount: { $sum: { $cond: ['$isRead', 1, 0] } }
          }
        }
      ]),
      
      Notification.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$priority',
            count: { $sum: 1 }
          }
        }
      ]),
      
      Notification.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    return {
      overview: {
        totalSent,
        totalRead,
        totalPending,
        readRate: totalSent > 0 ? ((totalRead / totalSent) * 100).toFixed(2) + '%' : '0%'
      },
      byTargetType: batchStats.map(s => ({
        targetType: s._id,
        count: s.count,
        readCount: s.readCount
      })),
      byPriority: priorityStats.map(s => ({
        priority: s._id,
        count: s.count
      })),
      byCategory: categoryStats.map(s => ({
        category: s._id,
        count: s.count
      }))
    };
  }
}

module.exports = { NotificationTargetingService };
