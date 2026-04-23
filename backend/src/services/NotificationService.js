const { Notification } = require("../models/Notification");
const { Role } = require("../models/Role");
const { UserRole } = require("../models/UserRole");
const { User } = require("../models/User");
const { ApiError } = require("../core/ApiError");

class NotificationService {
  static normalizeUserIds(userIds = []) {
    return [...new Set((userIds || []).map((item) => item?.toString()).filter(Boolean))];
  }

  static async createForUser(recipientUserId, payload = {}) {
    if (!recipientUserId) return null;

    return Notification.create({
      recipientUserId,
      title: payload.title,
      message: payload.message,
      category: payload.category || "System",
      actionUrl: payload.actionUrl || "",
      entityType: payload.entityType || "",
      entityId: payload.entityId || "",
      metadata: payload.metadata || {},
    });
  }

  static async createForUsers(userIds, payload = {}) {
    const normalized = this.normalizeUserIds(userIds);
    if (normalized.length === 0) return [];

    const docs = normalized.map((userId) => ({
      recipientUserId: userId,
      title: payload.title,
      message: payload.message,
      category: payload.category || "System",
      actionUrl: payload.actionUrl || "",
      entityType: payload.entityType || "",
      entityId: payload.entityId || "",
      metadata: payload.metadata || {},
    }));

    return Notification.insertMany(docs);
  }

  static async getUserIdsByRoleNames(roleNames = []) {
    const names = [...new Set((roleNames || []).filter(Boolean))];
    if (names.length === 0) return [];

    const roles = await Role.find({ name: { $in: names } }).select("_id");
    if (roles.length === 0) return [];

    const roleIds = roles.map((role) => role._id);
    const now = new Date();

    const links = await UserRole.find({
      roleId: { $in: roleIds },
      startsAt: { $lte: now },
      $or: [{ endsAt: null }, { endsAt: { $gt: now } }],
    }).select("userId");

    const userIds = this.normalizeUserIds(links.map((link) => link.userId));
    if (userIds.length === 0) return [];

    const activeUsers = await User.find({ _id: { $in: userIds }, isActive: true }).select("_id");
    return this.normalizeUserIds(activeUsers.map((user) => user._id));
  }

  static async createForRoleNames(roleNames = [], payload = {}) {
    const userIds = await this.getUserIdsByRoleNames(roleNames);
    return this.createForUsers(userIds, payload);
  }

  static async createForAllActiveUsers(payload = {}, options = {}) {
    const exclude = this.normalizeUserIds(options.excludeUserIds || []);
    const query = { isActive: true };
    if (exclude.length > 0) {
      query._id = { $nin: exclude };
    }

    const users = await User.find(query).select("_id");
    return this.createForUsers(users.map((user) => user._id), payload);
  }

  static async listForUser(userId, query = {}) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
    const unreadOnly = String(query.unreadOnly || "false") === "true";

    const filter = { recipientUserId: userId };
    if (unreadOnly) {
      filter.isRead = false;
    }

    const [items, total, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Notification.countDocuments(filter),
      Notification.countDocuments({ recipientUserId: userId, isRead: false }),
    ]);

    return {
      items,
      page,
      limit,
      total,
      unreadCount,
    };
  }

  static async getUnreadCount(userId) {
    const unreadCount = await Notification.countDocuments({ recipientUserId: userId, isRead: false });
    return { unreadCount };
  }

  static async markAsRead(notificationId, userId) {
    const item = await Notification.findOne({ _id: notificationId, recipientUserId: userId });
    if (!item) {
      throw new ApiError(404, "Notification not found");
    }

    if (!item.isRead) {
      item.isRead = true;
      item.readAt = new Date();
      await item.save();
    }

    return item;
  }

  static async markAllAsRead(userId) {
    const result = await Notification.updateMany(
      { recipientUserId: userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    return {
      updated: result.modifiedCount || 0,
    };
  }
}

module.exports = { NotificationService };
