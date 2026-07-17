const { RoomLog } = require("../models/RoomLog");

class RoomLogService {
  static async log({ roomId, bookingId, entityType, entityId, action, performedBy, metadata = {} }) {
    try {
      return await RoomLog.create({
        roomId,
        bookingId: bookingId || null,
        entityType: entityType || null,
        entityId: entityId || null,
        action,
        performedBy: performedBy || null,
        metadata,
      });
    } catch (err) {
      console.error("[RoomLogService] Failed to write log:", err.message);
      return null;
    }
  }

  static async getLogsForRoom(roomId, { from, to, action, page = 1, limit = 50 } = {}) {
    const query = { roomId };
    if (action) query.action = action;
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [logs, total] = await Promise.all([
      RoomLog.find(query)
        .populate("performedBy", "firstName lastName email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      RoomLog.countDocuments(query),
    ]);

    return { logs, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) };
  }

  static async getLogsForBooking(bookingId) {
    return RoomLog.find({ bookingId })
      .populate("performedBy", "firstName lastName email")
      .sort({ createdAt: 1 });
  }
}

module.exports = { RoomLogService };
