const { ApiResponse }    = require('../core/ApiResponse');
const { asyncHandler }   = require('../core/asyncHandler');
const { WorkshopService } = require('../services/WorkshopService');
const { WorkshopFeedService } = require('../services/WorkshopFeedService');
const { WorkshopSessionService } = require('../services/WorkshopSessionService');
const { WorkshopEngagementService } = require('../services/WorkshopEngagementService');
const { WorkshopCertificateService } = require('../services/WorkshopCertificateService');
const { WorkshopAdminService } = require('../services/WorkshopAdminService');

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

class WorkshopController {
  // ── Workshop CRUD ──────────────────────────────────────────────────────────

  static list = asyncHandler(async (req, res) => {
    const userId = req.auth?.userId || null;
    const workshops = await WorkshopService.listWorkshops(req.query, userId);
    return ApiResponse.ok(res, workshops, 'Workshops');
  });

  static detail = asyncHandler(async (req, res) => {
    const userId = req.auth?.userId || null;
    const workshop = await WorkshopService.getWorkshopById(req.params.id, userId);
    return ApiResponse.ok(res, workshop, 'Workshop');
  });

  static create = asyncHandler(async (req, res) => {
    const workshop = await WorkshopService.createWorkshop(req.body, req.auth.userId);
    return ApiResponse.created(res, workshop, 'Workshop created');
  });

  static update = asyncHandler(async (req, res) => {
    const workshop = await WorkshopService.updateWorkshop(req.params.id, req.body, req.auth.userId);
    return ApiResponse.ok(res, workshop, 'Workshop updated');
  });

  static remove = asyncHandler(async (req, res) => {
    await WorkshopService.deleteWorkshop(req.params.id);
    return ApiResponse.ok(res, null, 'Workshop deleted');
  });

  // ── Registration ───────────────────────────────────────────────────────────

  static register = asyncHandler(async (req, res) => {
    const reg = await WorkshopService.registerForWorkshop(
      req.params.id,
      req.auth.userId,
      req.body
    );
    return ApiResponse.created(res, reg, 'Registered successfully');
  });

  static myRegistration = asyncHandler(async (req, res) => {
    const reg = await WorkshopService.getMyRegistration(req.params.id, req.auth.userId);
    return ApiResponse.ok(res, reg, 'My registration');
  });

  static listRegistrations = asyncHandler(async (req, res) => {
    const regs = await WorkshopService.listRegistrations(req.params.id);
    return ApiResponse.ok(res, regs, 'Registrations');
  });

  static approveRegistration = asyncHandler(async (req, res) => {
    const reg = await WorkshopService.approveRegistration(req.params.regId);
    return ApiResponse.ok(res, reg, 'Registration approved');
  });

  static rejectRegistration = asyncHandler(async (req, res) => {
    const reg = await WorkshopService.rejectRegistration(req.params.regId, req.body.reason);
    return ApiResponse.ok(res, reg, 'Registration rejected');
  });

  // ── Payment ────────────────────────────────────────────────────────────────

  static initPayment = asyncHandler(async (req, res) => {
    const result = await WorkshopService.initPayment(req.params.regId, req.auth.userId);
    return ApiResponse.ok(res, result, 'Payment initiated');
  });

  static paymentSuccess = asyncHandler(async (req, res) => {
    await WorkshopService.handlePaymentSuccess(req.body);
    return res.redirect(`${frontendUrl}/dashboard/workshops/payment-success`);
  });

  static paymentFail = asyncHandler(async (req, res) => {
    await WorkshopService.handlePaymentFail(req.body);
    return res.redirect(`${frontendUrl}/dashboard/workshops/payment-fail`);
  });

  static paymentCancel = asyncHandler(async (req, res) => {
    await WorkshopService.handlePaymentCancel(req.body);
    return res.redirect(`${frontendUrl}/dashboard/workshops/payment-cancel`);
  });

  static paymentIpn = asyncHandler(async (req, res) => {
    await WorkshopService.handlePaymentSuccess(req.body);
    return res.status(200).send('OK');
  });

  // ── QR Check-in ────────────────────────────────────────────────────────────

  static checkIn = asyncHandler(async (req, res) => {
    const result = await WorkshopService.checkInByQR(req.body.qrToken, req.auth.userId);
    return ApiResponse.ok(res, result, 'Checked in successfully');
  });

  static getRegistrationById = asyncHandler(async (req, res) => {
    const reg = await WorkshopService.getRegistrationById(req.params.regId);
    return ApiResponse.ok(res, reg, 'Registration');
  });

  static addMaterial = asyncHandler(async (req, res) => {
    const workshop = await WorkshopService.addMaterial(req.params.id, req.body, req.auth.userId);
    return ApiResponse.ok(res, workshop, 'Material added');
  });

  static getMaterials = asyncHandler(async (req, res) => {
    const data = await WorkshopService.getMaterials(req.params.id, req.auth.userId);
    return ApiResponse.ok(res, data, 'Workshop resources');
  });

  // ── Community feed ─────────────────────────────────────────────────────────

  static feed = asyncHandler(async (req, res) => {
    const data = await WorkshopFeedService.listFeed(req.params.id);
    return ApiResponse.ok(res, data, 'Workshop feed');
  });

  static createPost = asyncHandler(async (req, res) => {
    const post = await WorkshopFeedService.createPost(req.params.id, req.body, req.auth.userId, req.requestMeta?.requestId);
    return ApiResponse.created(res, post, 'Post created');
  });

  static commentOnPost = asyncHandler(async (req, res) => {
    const comment = await WorkshopFeedService.addComment(req.params.id, req.params.postId, req.body, req.auth.userId, req.requestMeta?.requestId);
    return ApiResponse.created(res, comment, 'Comment added');
  });

  static editMaterial = asyncHandler(async (req, res) => {
    const workshop = await WorkshopService.editMaterial(req.params.id, parseInt(req.params.index), req.body);
    return ApiResponse.ok(res, workshop, 'Material updated');
  });

  static removeMaterial = asyncHandler(async (req, res) => {
    const workshop = await WorkshopService.removeMaterial(req.params.id, parseInt(req.params.index));
    return ApiResponse.ok(res, workshop, 'Material removed');
  });

  // ── Follow/Unfollow ────────────────────────────────────────────────────────

  static followWorkshop = asyncHandler(async (req, res) => {
    const result = await WorkshopService.followWorkshop(
      req.params.id,
      req.auth.userId,
      req.requestMeta.requestId
    );
    return ApiResponse.ok(res, result, result.message);
  });

  static unfollowWorkshop = asyncHandler(async (req, res) => {
    const result = await WorkshopService.unfollowWorkshop(
      req.params.id,
      req.auth.userId,
      req.requestMeta.requestId
    );
    return ApiResponse.ok(res, result, result.message);
  });

  // ── Sessions / Agenda ───────────────────────────────────────────────────────
  static listSessions = asyncHandler(async (req, res) => {
    const data = await WorkshopSessionService.listSessions(req.params.id);
    return ApiResponse.ok(res, data, 'Sessions');
  });
  static addSession = asyncHandler(async (req, res) => {
    const data = await WorkshopSessionService.addSession(req.params.id, req.body, req.auth.userId, req.requestMeta?.requestId);
    return ApiResponse.created(res, data, 'Session added');
  });
  static updateSession = asyncHandler(async (req, res) => {
    const data = await WorkshopSessionService.updateSession(req.params.id, req.params.sessionId, req.body, req.auth.userId);
    return ApiResponse.ok(res, data, 'Session updated');
  });
  static removeSession = asyncHandler(async (req, res) => {
    const data = await WorkshopSessionService.removeSession(req.params.id, req.params.sessionId, req.auth.userId);
    return ApiResponse.ok(res, data, 'Session removed');
  });

  // ── Attendance ────────────────────────────────────────────────────────────
  static attendanceOverview = asyncHandler(async (req, res) => {
    const data = await WorkshopSessionService.getAttendanceOverview(req.params.id, req.auth.userId);
    return ApiResponse.ok(res, data, 'Attendance overview');
  });
  static markAttendance = asyncHandler(async (req, res) => {
    const data = await WorkshopSessionService.markAttendance(req.params.id, req.params.sessionId, req.body.userId, req.body.attended, req.auth.userId);
    return ApiResponse.ok(res, data, 'Attendance marked');
  });
  static bulkAttendance = asyncHandler(async (req, res) => {
    const data = await WorkshopSessionService.bulkMarkAttendance(req.params.id, req.params.sessionId, req.body.entries || [], req.auth.userId);
    return ApiResponse.ok(res, data, 'Attendance updated');
  });

  // ── Prework ──────────────────────────────────────────────────────────────
  static addPrework = asyncHandler(async (req, res) => {
    const data = await WorkshopEngagementService.addPrework(req.params.id, req.body, req.auth.userId);
    return ApiResponse.created(res, data, 'Pre-work added');
  });
  static removePrework = asyncHandler(async (req, res) => {
    const data = await WorkshopEngagementService.removePrework(req.params.id, req.params.preworkId, req.auth.userId);
    return ApiResponse.ok(res, data, 'Pre-work removed');
  });
  static togglePrework = asyncHandler(async (req, res) => {
    const data = await WorkshopEngagementService.togglePrework(req.params.id, req.params.preworkId, req.body.done, req.auth.userId);
    return ApiResponse.ok(res, data, 'Pre-work updated');
  });

  // ── Assignments & submissions ────────────────────────────────────────────
  static addAssignment = asyncHandler(async (req, res) => {
    const data = await WorkshopEngagementService.addAssignment(req.params.id, req.body, req.auth.userId);
    return ApiResponse.created(res, data, 'Assignment added');
  });
  static removeAssignment = asyncHandler(async (req, res) => {
    const data = await WorkshopEngagementService.removeAssignment(req.params.id, req.params.assignmentId, req.auth.userId);
    return ApiResponse.ok(res, data, 'Assignment removed');
  });
  static submitAssignment = asyncHandler(async (req, res) => {
    const data = await WorkshopEngagementService.submitAssignment(req.params.id, req.params.assignmentId, req.body, req.auth.userId);
    return ApiResponse.created(res, data, 'Submission saved');
  });
  static mySubmissions = asyncHandler(async (req, res) => {
    const data = await WorkshopEngagementService.listMySubmissions(req.params.id, req.auth.userId);
    return ApiResponse.ok(res, data, 'My submissions');
  });
  static listSubmissions = asyncHandler(async (req, res) => {
    const data = await WorkshopEngagementService.listSubmissions(req.params.id, req.query.assignmentId, req.auth.userId);
    return ApiResponse.ok(res, data, 'Submissions');
  });
  static gradeSubmission = asyncHandler(async (req, res) => {
    const data = await WorkshopEngagementService.gradeSubmission(req.params.submissionId, req.body, req.auth.userId);
    return ApiResponse.ok(res, data, 'Submission graded');
  });
  static leaderboard = asyncHandler(async (req, res) => {
    const data = await WorkshopEngagementService.getLeaderboard(req.params.id, req.auth.userId);
    return ApiResponse.ok(res, data, 'Workshop leaderboard');
  });

  // ── Feedback & rating ──────────────────────────────────────────────────────
  static submitFeedback = asyncHandler(async (req, res) => {
    const data = await WorkshopEngagementService.submitFeedback(req.params.id, req.body, req.auth.userId);
    return ApiResponse.created(res, data, 'Feedback submitted');
  });
  static feedbackSummary = asyncHandler(async (req, res) => {
    const data = await WorkshopEngagementService.getFeedbackSummary(req.params.id, req.auth?.userId || null);
    return ApiResponse.ok(res, data, 'Feedback');
  });

  // ── Certificates ────────────────────────────────────────────────────────────
  static myCertificate = asyncHandler(async (req, res) => {
    const data = await WorkshopCertificateService.getMyCertificate(req.params.id, req.auth.userId);
    return ApiResponse.ok(res, data, 'Certificate');
  });
  static issueCertificates = asyncHandler(async (req, res) => {
    const data = await WorkshopCertificateService.issueForWorkshop(req.params.id, req.auth.userId, req.requestMeta?.requestId);
    return ApiResponse.ok(res, data, 'Certificates issued');
  });
  static downloadCertificate = asyncHandler(async (req, res) => {
    const cert = await WorkshopCertificateService.downloadCertificate(req.params.certificateId, req.auth.userId, req.auth.roles || []);
    return ApiResponse.ok(res, { certificateNo: cert.certificateNo, pdfData: cert.pdfData, recipientName: cert.recipientName }, 'Certificate download');
  });

  // ── Registration admin ───────────────────────────────────────────────────────
  static bulkRegistrationAction = asyncHandler(async (req, res) => {
    const data = await WorkshopAdminService.bulkAction(req.params.id, req.body, req.auth.userId, req.requestMeta?.requestId);
    return ApiResponse.ok(res, data, 'Bulk action complete');
  });
  static promoteWaitlist = asyncHandler(async (req, res) => {
    const data = await WorkshopAdminService.promoteWaitlist(req.params.id, req.auth.userId, req.requestMeta?.requestId);
    return ApiResponse.ok(res, data, 'Waitlist promoted');
  });
  static exportCsv = asyncHandler(async (req, res) => {
    const { csv, filename } = await WorkshopAdminService.exportCsv(req.params.id, req.auth.userId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csv);
  });
}

module.exports = { WorkshopController };
