const { ApiError } = require("../core/ApiError");
const { Meeting } = require("../models/Meeting");
const { MeetingAttendance } = require("../models/MeetingAttendance");
const { User } = require("../models/User");
const { Member } = require("../models/Member");
const { env } = require("../config/env");
const { AuditService } = require("./AuditService");
const { buildKitToken } = require("../utils/zegoKitToken");
const { randomUUID } = require("crypto");
const { MeetingStateManager } = require("./meeting/MeetingStateManager");
const { AttendanceStrategyFactory } = require("./meeting/AttendanceStrategy");
const { meetingEventManager } = require("./meeting/MeetingObserver");

function buildRoomId() {
  return `csedu-meeting-${randomUUID()}`;
}

function generateQRCode() {
  return `QR-${randomUUID()}`;
}

class MeetingService {
  /**
   * Create a new meeting
   */
  static async createMeeting(payload, actorId, requestId) {
    // Set start and end times
    const meetingDate = new Date(payload.meetingDate);
    const startTime = payload.startTime ? new Date(payload.startTime) : meetingDate;
    const endTime = payload.endTime ? new Date(payload.endTime) : new Date(startTime.getTime() + 60 * 60 * 1000); // Default 1 hour

    // Generate room ID for online meetings
    const roomId = ["Online", "Hybrid"].includes(payload.meetingMode) ? buildRoomId() : undefined;

    // Generate QR code if QR attendance is enabled
    const qrCode = payload.attendanceTracking?.method === "QR_Code" ? generateQRCode() : "";

    // Prepare meeting data
    const meetingData = {
      ...payload,
      meetingDate,
      startTime,
      endTime,
      calledBy: actorId,
      createdBy: actorId,
      status: payload.status || "Scheduled",
      onlineDetails: {
        ...payload.onlineDetails,
        roomId,
        platform: payload.onlineDetails?.platform || "Zego"
      },
      attendanceTracking: {
        enabled: payload.attendanceTracking?.enabled !== false,
        method: payload.attendanceTracking?.method || "Manual",
        qrCode,
        checkInStartTime: payload.attendanceTracking?.checkInStartTime || startTime,
        checkInEndTime: payload.attendanceTracking?.checkInEndTime || endTime,
        lateThreshold: payload.attendanceTracking?.lateThreshold || 15,
        requireCheckOut: payload.attendanceTracking?.requireCheckOut || false
      },
      stats: {
        totalParticipants: payload.participants?.length || 0
      }
    };

    const meeting = await Meeting.create(meetingData);

    // Log audit
    await AuditService.log({
      actorId,
      action: "MEETING_CREATED",
      resource: "Meeting",
      resourceId: meeting._id.toString(),
      requestId,
      metadata: {
        meetingType: meeting.meetingType,
        meetingMode: meeting.meetingMode,
        category: meeting.category
      }
    });

    // Notify participants
    await meetingEventManager.notifyObservers("created", {
      meeting,
      excludeUserIds: [actorId]
    });

    return meeting;
  }

  /**
   * Update meeting
   */
  static async updateMeeting(meetingId, payload, actorId, requestId) {
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      throw new ApiError(404, "Meeting not found");
    }

    // Update fields
    Object.keys(payload).forEach(key => {
      if (payload[key] !== undefined && key !== "_id") {
        meeting[key] = payload[key];
      }
    });

    meeting.lastModifiedBy = actorId;
    await meeting.save();

    await AuditService.log({
      actorId,
      action: "MEETING_UPDATED",
      resource: "Meeting",
      resourceId: meeting._id.toString(),
      requestId
    });

    return meeting;
  }

  /**
   * Get meeting by ID
   */
  static async getMeetingById(meetingId) {
    const meeting = await Meeting.findById(meetingId)
      .populate("calledBy", "firstName lastName email avatarUrl")
      .populate("participants.userId", "firstName lastName email avatarUrl")
      .populate("createdBy", "firstName lastName email");

    if (!meeting) {
      throw new ApiError(404, "Meeting not found");
    }

    return meeting;
  }

  /**
   * List meetings with filters
   */
  static async listMeetings(filters = {}) {
    const query = {};

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.meetingType) {
      query.meetingType = filters.meetingType;
    }

    if (filters.category) {
      query.category = filters.category;
    }

    if (filters.startDate || filters.endDate) {
      query.meetingDate = {};
      if (filters.startDate) query.meetingDate.$gte = new Date(filters.startDate);
      if (filters.endDate) query.meetingDate.$lte = new Date(filters.endDate);
    }

    if (filters.userId) {
      query["participants.userId"] = filters.userId;
    }

    return Meeting.find(query)
      .populate("calledBy", "firstName lastName email")
      .sort({ meetingDate: -1 });
  }

  /**
   * Start meeting
   */
  static async startMeeting(meetingId, actorId, requestId) {
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      throw new ApiError(404, "Meeting not found");
    }

    const updatedMeeting = await MeetingStateManager.startMeeting(meeting);

    await AuditService.log({
      actorId,
      action: "MEETING_STARTED",
      resource: "Meeting",
      resourceId: meeting._id.toString(),
      requestId
    });

    await meetingEventManager.notifyObservers("started", { meeting: updatedMeeting });

    return updatedMeeting;
  }

  /**
   * Complete meeting
   */
  static async completeMeeting(meetingId, payload, actorId, requestId) {
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      throw new ApiError(404, "Meeting not found");
    }

    // Update minutes and decisions if provided
    if (payload.minutes) meeting.minutes = payload.minutes;
    if (payload.decisions) meeting.decisions = payload.decisions;
    if (payload.minutesDocument) meeting.minutesDocument = payload.minutesDocument;

    const updatedMeeting = await MeetingStateManager.completeMeeting(meeting);

    // Update attendance stats
    await updatedMeeting.updateStats();

    await AuditService.log({
      actorId,
      action: "MEETING_COMPLETED",
      resource: "Meeting",
      resourceId: meeting._id.toString(),
      requestId
    });

    await meetingEventManager.notifyObservers("completed", { meeting: updatedMeeting });

    return updatedMeeting;
  }

  /**
   * Cancel meeting
   */
  static async cancelMeeting(meetingId, reason, actorId, requestId) {
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      throw new ApiError(404, "Meeting not found");
    }

    const updatedMeeting = await MeetingStateManager.cancelMeeting(meeting, reason);

    await AuditService.log({
      actorId,
      action: "MEETING_CANCELLED",
      resource: "Meeting",
      resourceId: meeting._id.toString(),
      requestId,
      metadata: { reason }
    });

    await meetingEventManager.notifyObservers("cancelled", { meeting: updatedMeeting });

    return updatedMeeting;
  }

  /**
   * Postpone meeting
   */
  static async postponeMeeting(meetingId, newDate, reason, actorId, requestId) {
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      throw new ApiError(404, "Meeting not found");
    }

    const updatedMeeting = await MeetingStateManager.postponeMeeting(meeting, newDate, reason);

    await AuditService.log({
      actorId,
      action: "MEETING_POSTPONED",
      resource: "Meeting",
      resourceId: meeting._id.toString(),
      requestId,
      metadata: { newDate, reason }
    });

    await meetingEventManager.notifyObservers("postponed", { meeting: updatedMeeting });

    return updatedMeeting;
  }

  /**
   * Record attendance using strategy pattern
   */
  static async recordAttendance(meetingId, attendanceData, actorId, requestId) {
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      throw new ApiError(404, "Meeting not found");
    }

    const method = attendanceData.method || meeting.attendanceTracking.method;
    const strategy = AttendanceStrategyFactory.getStrategy(method);

    const attendance = await strategy.recordAttendance({
      ...attendanceData,
      meetingId,
      recordedBy: actorId
    });

    // Update meeting stats
    await meeting.updateStats();

    await AuditService.log({
      actorId,
      action: "MEETING_ATTENDANCE_RECORDED",
      resource: "MeetingAttendance",
      resourceId: attendance._id.toString(),
      requestId,
      metadata: {
        meetingId: meetingId.toString(),
        method,
        attendanceStatus: attendance.attendanceStatus
      }
    });

    await meetingEventManager.notifyObservers("attendanceMarked", { attendance, meeting });

    return attendance;
  }

  /**
   * Bulk record attendance
   */
  static async recordBulkAttendance(meetingId, entries, actorId, requestId) {
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      throw new ApiError(404, "Meeting not found");
    }

    const attendances = [];
    for (const entry of entries) {
      const attendance = await this.recordAttendance(
        meetingId,
        { ...entry, method: "Manual" },
        actorId,
        requestId
      );
      attendances.push(attendance);
    }

    return attendances;
  }

  /**
   * Get meeting attendance
   */
  static async getMeetingAttendance(meetingId) {
    return MeetingAttendance.find({ meetingId })
      .populate("userId", "firstName lastName email avatarUrl")
      .populate("memberId", "studentId batch currentYear")
      .populate("recordedBy", "firstName lastName email")
      .sort({ checkInTime: 1 });
  }

  /**
   * Get user attendance history
   */
  static async getUserAttendanceHistory(userId, filters = {}) {
    const query = { userId };

    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }

    const attendances = await MeetingAttendance.find(query)
      .populate("meetingId", "title meetingDate venue meetingType")
      .sort({ createdAt: -1 });

    const stats = await MeetingAttendance.getAttendanceRate(
      userId,
      filters.startDate,
      filters.endDate
    );

    const consecutiveData = await MeetingAttendance.getConsecutiveAbsences(userId);

    return {
      attendances,
      stats,
      consecutiveAbsences: consecutiveData.consecutiveAbsences
    };
  }

  /**
   * Get absence alerts
   */
  static async getAbsenceAlerts(memberIds, consecutiveThreshold = 3) {
    const alerts = [];
    
    for (const memberId of memberIds) {
      const member = await Member.findById(memberId).populate("userId", "firstName lastName email");
      if (!member) continue;

      const consecutiveData = await MeetingAttendance.getConsecutiveAbsences(
        member.userId._id,
        consecutiveThreshold + 5
      );

      if (consecutiveData.consecutiveAbsences >= consecutiveThreshold) {
        alerts.push({
          memberId: member._id,
          userId: member.userId._id,
          userName: `${member.userId.firstName} ${member.userId.lastName}`,
          studentId: member.studentId,
          consecutiveAbsences: consecutiveData.consecutiveAbsences,
          message: `${consecutiveData.consecutiveAbsences} consecutive absences`,
          recentMeetings: consecutiveData.recentAttendances.slice(0, consecutiveThreshold)
        });
      }
    }

    return alerts;
  }

  /**
   * Generate Zego Kit Token for online meeting
   */
  static async generateZegoKitToken(meetingId, userId) {
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      throw new ApiError(404, "Meeting not found");
    }

    if (!["Online", "Hybrid"].includes(meeting.meetingMode)) {
      throw new ApiError(400, "This meeting does not support online participation");
    }

    if (!env.ZEGO_APP_ID || !env.ZEGO_SERVER_SECRET) {
      throw new ApiError(500, "Zego is not configured on the server");
    }

    const user = await User.findById(userId).select("firstName lastName email");
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const roomId = meeting.onlineDetails.roomId || buildRoomId();
    const userName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email || userId;
    const kitToken = buildKitToken(
      env.ZEGO_APP_ID,
      env.ZEGO_SERVER_SECRET,
      roomId,
      userId.toString(),
      userName
    );

    // Auto-mark attendance for online meetings
    if (meeting.attendanceTracking.method === "Auto_Online") {
      await this.recordAttendance(
        meetingId,
        {
          userId,
          joinedAt: new Date(),
          method: "Auto_Online"
        },
        userId,
        "auto-online-join"
      );
    }

    return {
      appToken: kitToken,
      roomId,
      userId: userId.toString(),
      userName,
      meetingTitle: meeting.title
    };
  }

  /**
   * Add agenda item
   */
  static async addAgendaItem(meetingId, agendaItem, actorId, requestId) {
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      throw new ApiError(404, "Meeting not found");
    }

    meeting.agendaItems.push({
      ...agendaItem,
      order: meeting.agendaItems.length + 1
    });

    await meeting.save();

    await AuditService.log({
      actorId,
      action: "MEETING_AGENDA_ITEM_ADDED",
      resource: "Meeting",
      resourceId: meeting._id.toString(),
      requestId
    });

    return meeting;
  }

  /**
   * Update agenda item
   */
  static async updateAgendaItem(meetingId, agendaItemId, updates, actorId, requestId) {
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      throw new ApiError(404, "Meeting not found");
    }

    const agendaItem = meeting.agendaItems.id(agendaItemId);
    if (!agendaItem) {
      throw new ApiError(404, "Agenda item not found");
    }

    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        agendaItem[key] = updates[key];
      }
    });

    await meeting.save();

    await AuditService.log({
      actorId,
      action: "MEETING_AGENDA_ITEM_UPDATED",
      resource: "Meeting",
      resourceId: meeting._id.toString(),
      requestId,
      metadata: { agendaItemId }
    });

    return meeting;
  }

  /**
   * Add meeting decision
   */
  static async addDecision(meetingId, decision, actorId, requestId) {
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      throw new ApiError(404, "Meeting not found");
    }

    meeting.decisions.push(decision);
    await meeting.save();

    await AuditService.log({
      actorId,
      action: "MEETING_DECISION_ADDED",
      resource: "Meeting",
      resourceId: meeting._id.toString(),
      requestId
    });

    return meeting;
  }

  /**
   * Add attachment
   */
  static async addAttachment(meetingId, attachment, actorId, requestId) {
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      throw new ApiError(404, "Meeting not found");
    }

    meeting.attachments.push({
      ...attachment,
      uploadedBy: actorId,
      uploadedAt: new Date()
    });

    await meeting.save();

    await AuditService.log({
      actorId,
      action: "MEETING_ATTACHMENT_ADDED",
      resource: "Meeting",
      resourceId: meeting._id.toString(),
      requestId
    });

    return meeting;
  }
}

module.exports = { MeetingService };
