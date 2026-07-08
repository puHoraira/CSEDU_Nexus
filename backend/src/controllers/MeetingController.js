const { ApiResponse } = require("../core/ApiResponse");
const { asyncHandler } = require("../core/asyncHandler");
const { MeetingService } = require("../services/MeetingService");

class MeetingController {
  static create = asyncHandler(async (req, res) => {
    const payload = {
      ...req.body,
      meetingDate: new Date(req.body.meetingDate),
      startTime: req.body.startTime ? new Date(req.body.startTime) : undefined,
      endTime: req.body.endTime ? new Date(req.body.endTime) : undefined
    };
    const meeting = await MeetingService.createMeeting(payload, req.auth.userId, req.requestMeta.requestId);
    return ApiResponse.created(res, meeting, "Meeting created");
  });

  static update = asyncHandler(async (req, res) => {
    const meeting = await MeetingService.updateMeeting(
      req.params.id,
      req.body,
      req.auth.userId,
      req.requestMeta.requestId
    );
    return ApiResponse.ok(res, meeting, "Meeting updated");
  });

  static detail = asyncHandler(async (req, res) => {
    const meeting = await MeetingService.getMeetingById(req.params.id);
    return ApiResponse.ok(res, meeting, "Meeting details");
  });

  static list = asyncHandler(async (req, res) => {
    const userId = req.auth?.userId || req.user?._id || null;
    const meetings = await MeetingService.listMeetings(req.query, userId);
    return ApiResponse.ok(res, meetings, "Meetings");
  });

  static start = asyncHandler(async (req, res) => {
    const meeting = await MeetingService.startMeeting(
      req.params.id,
      req.auth.userId,
      req.requestMeta.requestId
    );
    return ApiResponse.ok(res, meeting, "Meeting started");
  });

  static complete = asyncHandler(async (req, res) => {
    const meeting = await MeetingService.completeMeeting(
      req.params.id,
      req.body,
      req.auth.userId,
      req.requestMeta.requestId
    );
    return ApiResponse.ok(res, meeting, "Meeting completed");
  });

  static cancel = asyncHandler(async (req, res) => {
    const meeting = await MeetingService.cancelMeeting(
      req.params.id,
      req.body.reason,
      req.auth.userId,
      req.requestMeta.requestId
    );
    return ApiResponse.ok(res, meeting, "Meeting cancelled");
  });

  static postpone = asyncHandler(async (req, res) => {
    const meeting = await MeetingService.postponeMeeting(
      req.params.id,
      new Date(req.body.newDate),
      req.body.reason,
      req.auth.userId,
      req.requestMeta.requestId
    );
    return ApiResponse.ok(res, meeting, "Meeting postponed");
  });

  static recordAttendance = asyncHandler(async (req, res) => {
    const attendance = await MeetingService.recordAttendance(
      req.params.id,
      req.body,
      req.auth.userId,
      req.requestMeta.requestId
    );
    return ApiResponse.ok(res, attendance, "Attendance recorded");
  });

  static recordBulkAttendance = asyncHandler(async (req, res) => {
    const attendances = await MeetingService.recordBulkAttendance(
      req.params.id,
      req.body.entries,
      req.auth.userId,
      req.requestMeta.requestId
    );
    return ApiResponse.ok(res, attendances, "Bulk attendance recorded");
  });

  static getMeetingAttendance = asyncHandler(async (req, res) => {
    const attendances = await MeetingService.getMeetingAttendance(req.params.id);
    return ApiResponse.ok(res, attendances, "Meeting attendance");
  });

  static getUserAttendanceHistory = asyncHandler(async (req, res) => {
    const history = await MeetingService.getUserAttendanceHistory(
      req.auth.userId,
      req.query
    );
    return ApiResponse.ok(res, history, "Attendance history");
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

  static addAgendaItem = asyncHandler(async (req, res) => {
    const meeting = await MeetingService.addAgendaItem(
      req.params.id,
      req.body,
      req.auth.userId,
      req.requestMeta.requestId
    );
    return ApiResponse.ok(res, meeting, "Agenda item added");
  });

  static updateAgendaItem = asyncHandler(async (req, res) => {
    const meeting = await MeetingService.updateAgendaItem(
      req.params.id,
      req.params.agendaItemId,
      req.body,
      req.auth.userId,
      req.requestMeta.requestId
    );
    return ApiResponse.ok(res, meeting, "Agenda item updated");
  });

  static addDecision = asyncHandler(async (req, res) => {
    const meeting = await MeetingService.addDecision(
      req.params.id,
      req.body,
      req.auth.userId,
      req.requestMeta.requestId
    );
    return ApiResponse.ok(res, meeting, "Decision added");
  });

  static addAttachment = asyncHandler(async (req, res) => {
    const meeting = await MeetingService.addAttachment(
      req.params.id,
      req.body,
      req.auth.userId,
      req.requestMeta.requestId
    );
    return ApiResponse.ok(res, meeting, "Attachment added");
  });

  // Legacy endpoint for backward compatibility
  static attendance = asyncHandler(async (req, res) => {
    const attendances = await MeetingService.recordBulkAttendance(
      req.body.meetingId,
      req.body.entries,
      req.auth.userId,
      req.requestMeta.requestId
    );
    return ApiResponse.ok(res, attendances, "Attendance recorded");
  });
}

module.exports = { MeetingController };
