const { ApiError } = require("../core/ApiError");
const { Meeting } = require("../models/Meeting");
const { MeetingAttendance } = require("../models/MeetingAttendance");
const { User } = require("../models/User");
const { env } = require("../config/env");
const { AuditService } = require("./AuditService");
const { NotificationService } = require("./NotificationService");
const { buildKitToken } = require("../utils/zegoKitToken");
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

    await NotificationService.createForAllActiveUsers(
      {
        title: `New ${meeting.meetingMode.toLowerCase()} meeting scheduled`,
        message: `${meeting.title} is scheduled for ${new Date(meeting.meetingDate).toLocaleString()}.`,
        category: "Meeting",
        actionUrl: "/dashboard/meetings",
        entityType: "Meeting",
        entityId: meeting._id.toString(),
      },
      { excludeUserIds: [actorId] }
    );

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

  static async generateZegoKitToken(meetingId, userId) {
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) throw new ApiError(404, "Meeting not found");

    const meetingMode = meeting.meetingMode || (meeting.roomId ? "Online" : "Offline");
    if (meetingMode !== "Online") {
      throw new ApiError(400, "This meeting is offline and does not have a Zego room");
    }

    if (!env.ZEGO_APP_ID || !env.ZEGO_SERVER_SECRET) {
      throw new ApiError(500, "Zego is not configured on the server");
    }

    const user = await User.findById(userId).select("firstName lastName email");
    if (!user) throw new ApiError(404, "User not found");

    const roomId = meeting.roomId || `csedu-meeting-${meeting._id.toString()}`;
    const userName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email || userId;
    const kitToken = buildKitToken(env.ZEGO_APP_ID, env.ZEGO_SERVER_SECRET, roomId, userId.toString(), userName);

    return { appToken: kitToken, roomId, userId: userId.toString(), userName };
  }
}

module.exports = { MeetingService };
