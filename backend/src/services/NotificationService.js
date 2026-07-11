const { Notification } = require("../models/Notification");
const { Role } = require("../models/Role");
const { UserRole } = require("../models/UserRole");
const { User } = require("../models/User");
const { Member } = require("../models/Member");
const { ApiError } = require("../core/ApiError");
const { notificationHub } = require("./NotificationHub");

class NotificationService {
  static normalizeUserIds(userIds = []) {
    return [...new Set((userIds || []).map((item) => item?.toString()).filter(Boolean))];
  }

  /**
   * Normalize a payload into the canonical notification shape so every
   * notification — entity-driven or admin broadcast — has consistent fields.
   */
  static buildDoc(recipientUserId, payload = {}) {
    return {
      recipientUserId,
      title: payload.title,
      message: payload.message,
      category: payload.category || "System",
      priority: payload.priority || "Normal",
      actionUrl: payload.actionUrl || "",
      entityType: payload.entityType || "",
      entityId: payload.entityId || "",
      metadata: payload.metadata || {},
      targetType: payload.targetType || "Individual",
      sentBy: payload.sentBy || null,
      senderRole: payload.senderRole || "",
      batchId: payload.batchId || "",
      isSent: true,
      sentAt: new Date(),
      expiresAt: payload.expiresAt || null,
    };
  }

  static async createForUser(recipientUserId, payload = {}) {
    if (!recipientUserId) return null;

    const notification = await Notification.create(this.buildDoc(recipientUserId, payload));
    // Observer push (real-time). No-op if the user has no live connection.
    notificationHub.publishToUser(recipientUserId, notification);
    return notification;
  }

  static async createForUsers(userIds, payload = {}) {
    const normalized = this.normalizeUserIds(userIds);
    if (normalized.length === 0) return [];

    const docs = normalized.map((userId) => this.buildDoc(userId, payload));
    const created = await Notification.insertMany(docs);

    // Fan out real-time pushes to any connected observers.
    created.forEach((doc) => notificationHub.publishToUser(doc.recipientUserId, doc));
    return created;
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

  /**
   * Get users who match the target audience criteria
   * Used for events, workshops, meetings with targetAudience filtering
   */
  static async getUsersByTargetAudience(targetAudience = {}) {
    const {
      allowedYears = [],
      allowedBatches = [],
      allowedRoles = [],
      invitedUsers = [],
    } = targetAudience;

    let userIds = [];

    // Get explicitly invited users
    if (invitedUsers.length > 0) {
      userIds.push(...invitedUsers);
    }

    // Get users by role
    if (allowedRoles.length > 0) {
      const roleUserIds = await this.getUserIdsByRoleNames(allowedRoles);
      userIds.push(...roleUserIds);
    }

    // Get users by year/batch
    if (allowedYears.length > 0 || allowedBatches.length > 0) {
      const memberQuery = {};
      if (allowedYears.length > 0) {
        memberQuery.currentYear = { $in: allowedYears };
      }
      if (allowedBatches.length > 0) {
        memberQuery.batch = { $in: allowedBatches };
      }

      const members = await Member.find(memberQuery).select('userId');
      userIds.push(...members.map(m => m.userId));
    }

    // If no filters specified, return empty (don't notify everyone)
    if (userIds.length === 0) return [];

    // Remove duplicates and ensure users are active
    const normalized = this.normalizeUserIds(userIds);
    const activeUsers = await User.find({ _id: { $in: normalized }, isActive: true }).select("_id");
    return this.normalizeUserIds(activeUsers.map((user) => user._id));
  }

  /**
   * Notify event followers and participants
   * Used when event is updated or new post is created
   * @param {string} eventId - Event ID
   * @param {object} payload - Notification payload
   * @param {object} options - Options: { excludeUserIds: [], includeRegistered: true }
   */
  static async notifyEventFollowers(eventId, payload = {}, options = {}) {
    const { Event } = require('../models/Event');
    const { EventRegistration } = require('../models/EventRegistration');

    const event = await Event.findById(eventId).select('followers targetAudience');
    if (!event) return [];

    let userIds = [];

    // Add followers
    if (event.followers && event.followers.length > 0) {
      userIds.push(...event.followers);
    }

    // Add registered participants (unless explicitly excluded)
    const includeRegistered = options.includeRegistered !== false; // Default true
    if (includeRegistered) {
      const registrations = await EventRegistration.find({ eventId, status: { $ne: 'Cancelled' } }).select('userId');
      userIds.push(...registrations.map(r => r.userId));
    }

    // If event has target audience, also notify them (only if event is new/created)
    if (event.targetAudience && options.notifyTargetAudience) {
      const targetedUsers = await this.getUsersByTargetAudience(event.targetAudience);
      userIds.push(...targetedUsers);
    }

    // Exclude specific users if provided
    if (options.excludeUserIds) {
      const excluded = this.normalizeUserIds(options.excludeUserIds);
      userIds = userIds.filter(id => !excluded.includes(id.toString()));
    }

    return this.createForUsers(userIds, payload);
  }

  /**
   * Notify workshop followers and participants
   * @param {string} workshopId - Workshop ID
   * @param {object} payload - Notification payload
   * @param {object} options - Options: { excludeUserIds: [], includeRegistered: true }
   */
  static async notifyWorkshopFollowers(workshopId, payload = {}, options = {}) {
    const { Workshop } = require('../models/Workshop');
    const { WorkshopRegistration } = require('../models/WorkshopRegistration');

    const workshop = await Workshop.findById(workshopId).select('followers targetAudience');
    if (!workshop) return [];

    let userIds = [];

    // Add followers (if workshop has followers field)
    if (workshop.followers && workshop.followers.length > 0) {
      userIds.push(...workshop.followers);
    }

    // Add registered participants (unless explicitly excluded)
    const includeRegistered = options.includeRegistered !== false; // Default true
    if (includeRegistered) {
      const registrations = await WorkshopRegistration.find({ workshopId, status: { $ne: 'Cancelled' } }).select('userId');
      userIds.push(...registrations.map(r => r.userId));
    }

    // If workshop has target audience, also notify them (only if workshop is new/created)
    if (workshop.targetAudience && options.notifyTargetAudience) {
      const targetedUsers = await this.getUsersByTargetAudience(workshop.targetAudience);
      userIds.push(...targetedUsers);
    }

    // Exclude specific users if provided
    if (options.excludeUserIds) {
      const excluded = this.normalizeUserIds(options.excludeUserIds);
      userIds = userIds.filter(id => !excluded.includes(id.toString()));
    }

    return this.createForUsers(userIds, payload);
  }

  /**
   * Notify meeting participants based on target audience
   */
  static async notifyMeetingParticipants(meetingId, payload = {}, options = {}) {
    const { Meeting } = require('../models/Meeting');

    const meeting = await Meeting.findById(meetingId).select('targetAudience participants');
    if (!meeting) return [];

    let userIds = [];

    // Add explicit participants
    if (meeting.participants && meeting.participants.length > 0) {
      userIds.push(...meeting.participants.map(p => p.userId));
    }

    // Add users based on target audience
    if (meeting.targetAudience) {
      const targetedUsers = await this.getUsersByTargetAudience(meeting.targetAudience);
      userIds.push(...targetedUsers);
    }

    // Exclude specific users if provided
    if (options.excludeUserIds) {
      const excluded = this.normalizeUserIds(options.excludeUserIds);
      userIds = userIds.filter(id => !excluded.includes(id.toString()));
    }

    return this.createForUsers(userIds, payload);
  }

  /**
   * DEPRECATED: Use targeted methods instead
   * Only use this for truly global announcements (rare)
   */
  static async createForAllActiveUsers(payload = {}, options = {}) {
    console.warn('[NotificationService] createForAllActiveUsers is deprecated. Use targeted notification methods instead.');
    
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

  /**
   * Open a Server-Sent Events stream for a user. The response stays open and
   * receives `notification` and `unread-count` events pushed by NotificationHub
   * (the observer core). Returns nothing; it owns the response lifecycle.
   */
  static async openStream(req, res, userId) {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // disable proxy buffering (nginx)
    });
    res.write("retry: 10000\n\n"); // client auto-reconnect hint

    // Send the current unread count immediately so the bell is correct on connect.
    const { unreadCount } = await this.getUnreadCount(userId);
    res.write(`event: unread-count\ndata: ${JSON.stringify({ unreadCount })}\n\n`);

    const unsubscribe = notificationHub.addConnection(userId, res);

    // Heartbeat keeps the connection alive through idle proxies.
    const heartbeat = setInterval(() => {
      try {
        res.write(": ping\n\n");
      } catch (_err) {
        cleanup();
      }
    }, 25000);

    const cleanup = () => {
      clearInterval(heartbeat);
      unsubscribe();
    };

    req.on("close", cleanup);
    req.on("error", cleanup);
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
      // Push the new unread count to the user's live observers.
      const { unreadCount } = await this.getUnreadCount(userId);
      notificationHub.publishUnreadCount(userId, unreadCount);
    }

    return item;
  }

  static async markAllAsRead(userId) {
    const result = await Notification.updateMany(
      { recipientUserId: userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    notificationHub.publishUnreadCount(userId, 0);

    return {
      updated: result.modifiedCount || 0,
    };
  }
}

module.exports = { NotificationService };
