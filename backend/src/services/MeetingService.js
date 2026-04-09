const { ApiError } = require("../core/ApiError");
const { Meeting } = require("../models/Meeting");
const { MeetingAttendance } = require("../models/MeetingAttendance");
const { AuditService } = require("./AuditService");
const { randomUUID } = require("crypto");

function buildRoomId() {
  return `csedu-meeting-${randomUUID()}`;
}

class MeetingService {
  static async createMeeting(payload, actorId, requestId) {
    const roomId = payload.meetingMode === "Online" ? buildRoomId() : undefined;
    const meeting = await Meeting.create({ ...payload, calledBy: actorId, roomId });
    await AuditService.log({
      actorId,
      action: "MEETING_CREATED",
      resource: "Meeting",
      resourceId: meeting._id.toString(),
      requestId,
    });
    return meeting;
  }

  static async listMeetings() {
    return Meeting.find({}).sort({ meetingDate: -1 });
  }

  static async recordAttendance(meetingId, entries, actorId, requestId) {
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) throw new ApiError(404, "Meeting not found");

    for (const entry of entries) {
      await MeetingAttendance.findOneAndUpdate(
        { meetingId, memberId: entry.memberId },
        { meetingId, memberId: entry.memberId, present: entry.present, signedAt: new Date() },
        { upsert: true, new: true }
      );
    }

    await AuditService.log({
      actorId,
      action: "MEETING_ATTENDANCE_RECORDED",
      resource: "Meeting",
      resourceId: meetingId,
      requestId,
      metadata: { entriesCount: entries.length },
    });

    return MeetingAttendance.find({ meetingId });
  }

  static async getAbsenceAlerts(memberIds, consecutiveThreshold = 3) {
    const alerts = [];
    for (const memberId of memberIds) {
      const latestAttendances = await MeetingAttendance.find({ memberId }).sort({ createdAt: -1 }).limit(consecutiveThreshold);
      if (latestAttendances.length < consecutiveThreshold) continue;
      const allAbsent = latestAttendances.every((row) => row.present === false);
      if (allAbsent) {
        alerts.push({ memberId, message: `${consecutiveThreshold} consecutive absences` });
      }
    }
    return alerts;
  }
}

module.exports = { MeetingService };
