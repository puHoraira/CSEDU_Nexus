const { ApiResponse } = require("../core/ApiResponse");
const { asyncHandler } = require("../core/asyncHandler");
const { MeetingService } = require("../services/MeetingService");

class MeetingController {
  static create = asyncHandler(async (req, res) => {
    const payload = { ...req.body, meetingDate: new Date(req.body.meetingDate) };
    const item = await MeetingService.createMeeting(payload, req.auth.userId, req.requestMeta.requestId);
    return ApiResponse.created(res, item, "Meeting created");
  });

  static list = asyncHandler(async (_req, res) => {
    const rows = await MeetingService.listMeetings();
    return ApiResponse.ok(res, rows, "Meetings");
  });

  static attendance = asyncHandler(async (req, res) => {
    const rows = await MeetingService.recordAttendance(
      req.body.meetingId,
      req.body.entries,
      req.auth.userId,
      req.requestMeta.requestId
    );
    return ApiResponse.ok(res, rows, "Attendance recorded");
  });

  static absenceAlerts = asyncHandler(async (req, res) => {
    const memberIds = req.body.memberIds || [];
    const alerts = await MeetingService.getAbsenceAlerts(memberIds, req.body.threshold || 3);
    return ApiResponse.ok(res, alerts, "Absence alerts");
  });

  static zegoKitToken = asyncHandler(async (req, res) => {
    const data = await MeetingService.generateZegoKitToken(req.params.id, req.auth.userId);
    return ApiResponse.ok(res, data, "Zego kit token");
  });
}

module.exports = { MeetingController };
