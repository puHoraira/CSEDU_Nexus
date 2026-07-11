const { EventEmitter } = require("events");

/**
 * NotificationHub — the observer core of the notification system.
 * -------------------------------------------------------------------------
 * A single in-process pub/sub hub. Every notification create path publishes
 * here; SSE connections (observers) subscribe per-user and receive pushes in
 * real time. This is the classic Observer pattern:
 *
 *   Producers (services)  ──emit──►  NotificationHub  ──push──►  Observers (SSE clients)
 *
 * Falls back gracefully: if a user has no active connection, the notification
 * is still persisted (by the caller) and delivered on next poll/refresh.
 * -------------------------------------------------------------------------
 */
class NotificationHub extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(0); // unbounded — one listener bucket per connected user
    /** @type {Map<string, Set<import('http').ServerResponse>>} userId -> SSE responses */
    this.connections = new Map();
  }

  /** Register an SSE response stream for a user. Returns an unsubscribe fn. */
  addConnection(userId, res) {
    const key = userId.toString();
    if (!this.connections.has(key)) this.connections.set(key, new Set());
    this.connections.get(key).add(res);

    return () => this.removeConnection(userId, res);
  }

  removeConnection(userId, res) {
    const key = userId.toString();
    const set = this.connections.get(key);
    if (!set) return;
    set.delete(res);
    if (set.size === 0) this.connections.delete(key);
  }

  /** How many live observers a user currently has (used for lazy work). */
  connectionCount(userId) {
    return this.connections.get(userId.toString())?.size || 0;
  }

  /** Low-level: write a typed SSE event to all of a user's streams. */
  _send(userId, event, data) {
    const set = this.connections.get(userId.toString());
    if (!set || set.size === 0) return false;
    const frame = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of set) {
      try {
        res.write(frame);
      } catch (_err) {
        this.removeConnection(userId, res);
      }
    }
    return true;
  }

  /**
   * Publish a freshly-created notification to a single recipient.
   * Emits both an app-level event (for other server observers) and an SSE push.
   */
  publishToUser(userId, notification) {
    if (!userId) return;
    const payload = this._serialize(notification);
    this.emit("notification", { userId: userId.toString(), notification: payload });
    this._send(userId, "notification", payload);
  }

  /** Publish the same notification content to many recipients. */
  publishToUsers(userIds = [], notifications = []) {
    // notifications is expected aligned to userIds, or a single shared payload.
    const list = Array.isArray(notifications) ? notifications : [];
    if (list.length === userIds.length) {
      userIds.forEach((uid, i) => this.publishToUser(uid, list[i]));
    } else {
      const shared = list[0];
      userIds.forEach((uid) => this.publishToUser(uid, shared));
    }
  }

  /** Push an updated unread count to a user (after read/markAll actions). */
  publishUnreadCount(userId, unreadCount) {
    if (!userId) return;
    this._send(userId, "unread-count", { unreadCount });
  }

  _serialize(notification) {
    if (!notification) return null;
    const n = typeof notification.toObject === "function" ? notification.toObject() : notification;
    return {
      _id: n._id?.toString?.() || n._id,
      title: n.title,
      message: n.message,
      category: n.category,
      priority: n.priority || "Normal",
      actionUrl: n.actionUrl || "",
      entityType: n.entityType || "",
      entityId: n.entityId || "",
      isRead: Boolean(n.isRead),
      createdAt: n.createdAt || new Date().toISOString(),
    };
  }
}

// Singleton across the whole process.
const notificationHub = new NotificationHub();

module.exports = { notificationHub, NotificationHub };
