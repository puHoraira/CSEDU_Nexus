const { ApiError } = require("../../core/ApiError");

/**
 * Strategy Pattern for Attendance Tracking
 * Different strategies for recording attendance based on method
 */

class AttendanceStrategy {
  /**
   * Record attendance
   * @param {Object} params - Attendance parameters
   * @returns {Promise<Object>} Attendance record
   */
  async recordAttendance(params) {
    throw new Error("recordAttendance() must be implemented by subclass");
  }

  /**
   * Validate attendance data
   * @param {Object} params - Attendance parameters
   * @returns {boolean} True if valid
   */
  validate(params) {
    throw new Error("validate() must be implemented by subclass");
  }
}

/**
 * Manual Attendance Strategy
 * Organizer manually marks attendance
 */
class ManualAttendanceStrategy extends AttendanceStrategy {
  validate(params) {
    return Boolean(params.userId && params.meetingId && params.present !== undefined);
  }

  async recordAttendance(params) {
    const { MeetingAttendance } = require("../../models/MeetingAttendance");
    const { Meeting } = require("../../models/Meeting");
    
    if (!this.validate(params)) {
      throw new ApiError(400, "Invalid attendance data");
    }

    const meeting = await Meeting.findById(params.meetingId);
    if (!meeting) {
      throw new ApiError(404, "Meeting not found");
    }

    const attendance = await MeetingAttendance.findOneAndUpdate(
      { meetingId: params.meetingId, userId: params.userId },
      {
        meetingId: params.meetingId,
        userId: params.userId,
        memberId: params.memberId,
        present: params.present,
        attendanceStatus: params.present ? "Present" : "Absent",
        checkInTime: params.present ? new Date() : null,
        checkInMethod: "Manual",
        recordedBy: params.recordedBy,
        notes: params.notes || "",
        signedAt: new Date()
      },
      { upsert: true, new: true }
    );

    return attendance;
  }
}

/**
 * QR Code Attendance Strategy
 * Users scan QR code to mark attendance
 */
class QRCodeAttendanceStrategy extends AttendanceStrategy {
  validate(params) {
    return Boolean(
      params.userId &&
      params.meetingId &&
      params.qrCode &&
      params.scannedCode
    );
  }

  async recordAttendance(params) {
    const { MeetingAttendance } = require("../../models/MeetingAttendance");
    const { Meeting } = require("../../models/Meeting");
    
    if (!this.validate(params)) {
      throw new ApiError(400, "Invalid QR code attendance data");
    }

    const meeting = await Meeting.findById(params.meetingId);
    if (!meeting) {
      throw new ApiError(404, "Meeting not found");
    }

    // Verify QR code
    if (meeting.attendanceTracking.qrCode !== params.scannedCode) {
      throw new ApiError(400, "Invalid QR code");
    }

    // Check if within check-in window
    const now = new Date();
    if (meeting.attendanceTracking.checkInStartTime && now < meeting.attendanceTracking.checkInStartTime) {
      throw new ApiError(400, "Check-in has not started yet");
    }
    if (meeting.attendanceTracking.checkInEndTime && now > meeting.attendanceTracking.checkInEndTime) {
      throw new ApiError(400, "Check-in window has closed");
    }

    // Calculate if late
    const lateThreshold = meeting.attendanceTracking.lateThreshold || 15;
    const minutesAfterStart = Math.round((now - meeting.startTime) / (1000 * 60));
    const isLate = minutesAfterStart > lateThreshold;

    const attendance = await MeetingAttendance.findOneAndUpdate(
      { meetingId: params.meetingId, userId: params.userId },
      {
        meetingId: params.meetingId,
        userId: params.userId,
        memberId: params.memberId,
        present: true,
        attendanceStatus: isLate ? "Late" : "Present",
        isLate,
        lateByMinutes: isLate ? minutesAfterStart : 0,
        checkInTime: now,
        checkInMethod: "QR_Code",
        checkInLocation: params.location || {},
        signedAt: now
      },
      { upsert: true, new: true }
    );

    return attendance;
  }
}

/**
 * Auto Online Attendance Strategy
 * Automatically marks attendance when user joins online meeting
 */
class AutoOnlineAttendanceStrategy extends AttendanceStrategy {
  validate(params) {
    return Boolean(
      params.userId &&
      params.meetingId &&
      params.joinedAt
    );
  }

  async recordAttendance(params) {
    const { MeetingAttendance } = require("../../models/MeetingAttendance");
    const { Meeting } = require("../../models/Meeting");
    
    if (!this.validate(params)) {
      throw new ApiError(400, "Invalid auto online attendance data");
    }

    const meeting = await Meeting.findById(params.meetingId);
    if (!meeting) {
      throw new ApiError(404, "Meeting not found");
    }

    if (meeting.meetingMode === "Offline") {
      throw new ApiError(400, "Auto online attendance is only for online meetings");
    }

    // Calculate if late
    const lateThreshold = meeting.attendanceTracking.lateThreshold || 15;
    const joinedAt = new Date(params.joinedAt);
    const minutesAfterStart = Math.round((joinedAt - meeting.startTime) / (1000 * 60));
    const isLate = minutesAfterStart > lateThreshold;

    const attendance = await MeetingAttendance.findOneAndUpdate(
      { meetingId: params.meetingId, userId: params.userId },
      {
        meetingId: params.meetingId,
        userId: params.userId,
        memberId: params.memberId,
        present: true,
        attendanceStatus: isLate ? "Late" : "Present",
        isLate,
        lateByMinutes: isLate ? minutesAfterStart : 0,
        checkInTime: joinedAt,
        checkInMethod: "Auto_Online",
        signedAt: joinedAt
      },
      { upsert: true, new: true }
    );

    return attendance;
  }
}

/**
 * Self Reported Attendance Strategy
 * Users self-report their attendance
 */
class SelfReportedAttendanceStrategy extends AttendanceStrategy {
  validate(params) {
    return Boolean(params.userId && params.meetingId);
  }

  async recordAttendance(params) {
    const { MeetingAttendance } = require("../../models/MeetingAttendance");
    const { Meeting } = require("../../models/Meeting");
    
    if (!this.validate(params)) {
      throw new ApiError(400, "Invalid self-reported attendance data");
    }

    const meeting = await Meeting.findById(params.meetingId);
    if (!meeting) {
      throw new ApiError(404, "Meeting not found");
    }

    const now = new Date();
    const minutesAfterStart = Math.round((now - meeting.startTime) / (1000 * 60));
    const lateThreshold = meeting.attendanceTracking.lateThreshold || 15;
    const isLate = minutesAfterStart > lateThreshold;

    const attendance = await MeetingAttendance.findOneAndUpdate(
      { meetingId: params.meetingId, userId: params.userId },
      {
        meetingId: params.meetingId,
        userId: params.userId,
        memberId: params.memberId,
        present: true,
        attendanceStatus: isLate ? "Late" : "Present",
        isLate,
        lateByMinutes: isLate ? minutesAfterStart : 0,
        checkInTime: now,
        checkInMethod: "Self_Reported",
        verified: false, // Requires verification
        notes: params.notes || "",
        signedAt: now
      },
      { upsert: true, new: true }
    );

    return attendance;
  }
}

/**
 * Attendance Strategy Factory
 * Creates appropriate attendance strategy based on method
 */
class AttendanceStrategyFactory {
  static strategies = {
    Manual: ManualAttendanceStrategy,
    QR_Code: QRCodeAttendanceStrategy,
    Auto_Online: AutoOnlineAttendanceStrategy,
    Self_Reported: SelfReportedAttendanceStrategy
  };

  static getStrategy(method) {
    const StrategyClass = this.strategies[method];
    if (!StrategyClass) {
      throw new ApiError(400, `Attendance method ${method} is not supported`);
    }
    return new StrategyClass();
  }

  static getSupportedMethods() {
    return Object.keys(this.strategies);
  }
}

module.exports = {
  AttendanceStrategy,
  ManualAttendanceStrategy,
  QRCodeAttendanceStrategy,
  AutoOnlineAttendanceStrategy,
  SelfReportedAttendanceStrategy,
  AttendanceStrategyFactory
};
