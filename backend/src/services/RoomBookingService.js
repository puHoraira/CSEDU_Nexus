const { RoomBooking } = require("../models/RoomBooking");
const { Room } = require("../models/Room");
const { ApiError } = require("../core/ApiError");
const { AuditService } = require("./AuditService");

/**
 * RoomBookingService
 * -------------------------------------------------------------------------
 * Enforces real, time-based room reservations. Two active bookings for the
 * same room may never overlap in time. Events/workshops reserve a room for
 * their scheduled window; overlapping reservations are rejected.
 *
 * Overlap rule: two intervals [aStart, aEnd) and [bStart, bEnd) overlap iff
 *   aStart < bEnd  AND  bStart < aEnd
 * (touching edges — one ends exactly when the next starts — do NOT overlap.)
 * -------------------------------------------------------------------------
 */
class RoomBookingService {
  /**
   * Find active bookings for a room that overlap the given window.
   * @param {string} roomId
   * @param {Date|string} startTime
   * @param {Date|string} endTime
   * @param {object} opts - { excludeEventId, excludeWorkshopId, excludeBookingId }
   * @returns {Promise<Array>} conflicting bookings
   */
  static async findConflicts(roomId, startTime, endTime, opts = {}) {
    const start = new Date(startTime);
    const end = new Date(endTime);

    const query = {
      roomId,
      status: "Active",
      // overlap: existing.start < new.end AND existing.end > new.start
      startTime: { $lt: end },
      endTime: { $gt: start },
    };
    if (opts.excludeEventId) query.eventId = { $ne: opts.excludeEventId };
    if (opts.excludeWorkshopId) query.workshopId = { $ne: opts.excludeWorkshopId };
    if (opts.excludeBookingId) query._id = { $ne: opts.excludeBookingId };

    return RoomBooking.find(query)
      .populate("eventId", "title")
      .populate("workshopId", "title")
      .sort({ startTime: 1 });
  }

  /**
   * Validate a set of room reservations for one owner (event/workshop) against
   * a time window. Returns { ok, conflicts:[{roomId, roomName, with, startTime, endTime}] }.
   */
  static async validateRooms(roomIds, startTime, endTime, opts = {}) {
    if (!startTime || !endTime) {
      throw new ApiError(400, "A start and end time are required to reserve a room");
    }
    if (new Date(endTime) <= new Date(startTime)) {
      throw new ApiError(400, "Room reservation end time must be after start time");
    }

    const conflicts = [];
    for (const roomId of roomIds) {
      const overlaps = await this.findConflicts(roomId, startTime, endTime, opts);
      if (overlaps.length > 0) {
        const room = await Room.findById(roomId).select("roomName roomNumber");
        for (const o of overlaps) {
          conflicts.push({
            roomId: roomId.toString(),
            roomName: room ? `${room.roomName} (${room.roomNumber})` : "Room",
            with: o.title || o.eventId?.title || o.workshopId?.title || "another booking",
            startTime: o.startTime,
            endTime: o.endTime,
          });
        }
      }
    }
    return { ok: conflicts.length === 0, conflicts };
  }

  /**
   * Replace all bookings for an owner (event/workshop) with a fresh set for
   * the given rooms + window. Rejects if ANY room conflicts. Atomic-ish:
   * validates everything first, then cancels old + creates new.
   */
  static async syncOwnerBookings({ ownerType, ownerId, roomIds, startTime, endTime, title, bookedBy }) {
    const excludeKey = ownerType === "Event" ? "excludeEventId" : "excludeWorkshopId";

    // Nothing to book (no rooms or no window) → just clear existing bookings.
    if (!roomIds || roomIds.length === 0 || !startTime || !endTime) {
      await this.releaseOwnerBookings(ownerType, ownerId);
      return { booked: 0, conflicts: [] };
    }

    // Validate all rooms against everyone EXCEPT this owner's own bookings.
    const { ok, conflicts } = await this.validateRooms(roomIds, startTime, endTime, { [excludeKey]: ownerId });
    if (!ok) {
      const list = conflicts.map((c) => `${c.roomName} — already booked by "${c.with}" (${new Date(c.startTime).toLocaleString()} – ${new Date(c.endTime).toLocaleString()})`).join("; ");
      throw new ApiError(409, `Room booking conflict: ${list}`);
    }

    // Clear this owner's previous bookings, then create fresh ones.
    await this.releaseOwnerBookings(ownerType, ownerId);

    const created = [];
    for (const roomId of roomIds) {
      const booking = await RoomBooking.create({
        roomId,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        bookedForType: ownerType,
        eventId: ownerType === "Event" ? ownerId : null,
        workshopId: ownerType === "Workshop" ? ownerId : null,
        title: title || "",
        bookedBy: bookedBy || null,
        status: "Active",
      });
      created.push(booking);
    }

    await AuditService.log({
      actorId: bookedBy || null,
      action: "ROOM_BOOKINGS_SYNCED",
      resource: ownerType,
      resourceId: ownerId.toString(),
      metadata: { rooms: roomIds.length, startTime, endTime },
    }).catch(() => {});

    return { booked: created.length, conflicts: [] };
  }

  /** Cancel all active bookings owned by an event/workshop. */
  static async releaseOwnerBookings(ownerType, ownerId) {
    const key = ownerType === "Event" ? "eventId" : "workshopId";
    const res = await RoomBooking.updateMany(
      { [key]: ownerId, status: "Active" },
      { status: "Cancelled" }
    );
    return res.modifiedCount || 0;
  }

  /** A room's upcoming schedule (active bookings). */
  static async getRoomSchedule(roomId, { from, to } = {}) {
    const query = { roomId, status: "Active" };
    if (from || to) {
      query.endTime = query.endTime || {};
      if (from) query.endTime.$gte = new Date(from);
      if (to) query.startTime = { $lte: new Date(to) };
    }
    return RoomBooking.find(query)
      .populate("eventId", "title")
      .populate("workshopId", "title")
      .sort({ startTime: 1 });
  }

  /**
   * Rooms that are free for the entire [startTime, endTime] window.
   * Time-aware replacement for the old currentUsage check.
   */
  static async getAvailableRooms(startTime, endTime, minCapacity = 0) {
    const rooms = await Room.find({
      isActive: true,
      isAvailableForBooking: true,
      totalCapacity: { $gte: minCapacity },
    }).sort({ building: 1, floor: 1, roomNumber: 1 });

    if (!startTime || !endTime) {
      return rooms.map((r) => ({ ...r.toObject(), isAvailable: true }));
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    const out = [];
    for (const room of rooms) {
      const conflict = await RoomBooking.findOne({
        roomId: room._id,
        status: "Active",
        startTime: { $lt: end },
        endTime: { $gt: start },
      })
        .populate("eventId", "title")
        .populate("workshopId", "title");
      const obj = room.toObject();
      obj.isAvailable = !conflict;
      obj.conflictWith = conflict ? (conflict.title || conflict.eventId?.title || conflict.workshopId?.title || "another booking") : null;
      obj.conflictWindow = conflict ? { startTime: conflict.startTime, endTime: conflict.endTime } : null;
      out.push(obj);
    }
    return out;
  }
}

module.exports = { RoomBookingService };
