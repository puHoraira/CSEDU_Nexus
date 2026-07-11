const express = require('express');
const { WorkshopController } = require('../controllers/WorkshopController');
const { authenticate, optionalAuthenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  createWorkshopPostSchema, createWorkshopCommentSchema,
  sessionSchema, preworkSchema, assignmentSchema, submissionSchema,
  gradeSchema, feedbackSchema, bulkActionSchema, markAttendanceSchema, bulkAttendanceSchema,
} = require('../validators/workshopValidators');

const router = express.Router();

// Public (audience gating applied inside the controller when user context exists)
router.get('/',    optionalAuthenticate, WorkshopController.list);
router.get('/:id', optionalAuthenticate, WorkshopController.detail);

// Payment callbacks (no auth — called by SSLCommerz)
router.post('/payment/success', WorkshopController.paymentSuccess);
router.post('/payment/fail',    WorkshopController.paymentFail);
router.post('/payment/cancel',  WorkshopController.paymentCancel);
router.post('/payment/ipn',     WorkshopController.paymentIpn);

// Authenticated
router.post('/',    authenticate, WorkshopController.create);
router.patch('/:id', authenticate, WorkshopController.update);
router.delete('/:id', authenticate, WorkshopController.remove);

// Registration
router.post('/:id/register',       authenticate, WorkshopController.register);
router.get('/:id/my-registration', authenticate, WorkshopController.myRegistration);
router.get('/:id/registrations',   authenticate, WorkshopController.listRegistrations);

// Follow/Unfollow workshops
router.post('/:id/follow', authenticate, WorkshopController.followWorkshop);
router.delete('/:id/follow', authenticate, WorkshopController.unfollowWorkshop);

// Approval
router.patch('/:id/registrations/:regId/approve', authenticate, WorkshopController.approveRegistration);
router.patch('/:id/registrations/:regId/reject',  authenticate, WorkshopController.rejectRegistration);

// Payment init
router.post('/registrations/:regId/pay', authenticate, WorkshopController.initPayment);
router.get('/registrations/:regId',      authenticate, WorkshopController.getRegistrationById);

// QR Check-in
router.post('/check-in', authenticate, WorkshopController.checkIn);

// Materials management
router.get('/:id/materials',           authenticate, WorkshopController.getMaterials);
router.post('/:id/materials',          authenticate, WorkshopController.addMaterial);
router.put('/:id/materials/:index',    authenticate, WorkshopController.editMaterial);
router.delete('/:id/materials/:index', authenticate, WorkshopController.removeMaterial);

// Community feed (announcements + discussion, with images)
router.get('/:id/feed', optionalAuthenticate, WorkshopController.feed);
router.post('/:id/posts', authenticate, validate(createWorkshopPostSchema), WorkshopController.createPost);
router.post('/:id/posts/:postId/comments', authenticate, validate(createWorkshopCommentSchema), WorkshopController.commentOnPost);

// Sessions / Agenda
router.get('/:id/sessions', optionalAuthenticate, WorkshopController.listSessions);
router.post('/:id/sessions', authenticate, validate(sessionSchema), WorkshopController.addSession);
router.put('/:id/sessions/:sessionId', authenticate, WorkshopController.updateSession);
router.delete('/:id/sessions/:sessionId', authenticate, WorkshopController.removeSession);

// Attendance
router.get('/:id/attendance', authenticate, WorkshopController.attendanceOverview);
router.post('/:id/sessions/:sessionId/attendance', authenticate, validate(markAttendanceSchema), WorkshopController.markAttendance);
router.post('/:id/sessions/:sessionId/attendance/bulk', authenticate, validate(bulkAttendanceSchema), WorkshopController.bulkAttendance);

// Pre-work checklist
router.post('/:id/prework', authenticate, validate(preworkSchema), WorkshopController.addPrework);
router.delete('/:id/prework/:preworkId', authenticate, WorkshopController.removePrework);
router.post('/:id/prework/:preworkId/toggle', authenticate, WorkshopController.togglePrework);

// Assignments & submissions
router.post('/:id/assignments', authenticate, validate(assignmentSchema), WorkshopController.addAssignment);
router.delete('/:id/assignments/:assignmentId', authenticate, WorkshopController.removeAssignment);
router.post('/:id/assignments/:assignmentId/submit', authenticate, validate(submissionSchema), WorkshopController.submitAssignment);
router.get('/:id/my-submissions', authenticate, WorkshopController.mySubmissions);
router.get('/:id/submissions', authenticate, WorkshopController.listSubmissions);
router.get('/:id/leaderboard', authenticate, WorkshopController.leaderboard);
router.post('/submissions/:submissionId/grade', authenticate, validate(gradeSchema), WorkshopController.gradeSubmission);

// Feedback & rating
router.get('/:id/feedback', optionalAuthenticate, WorkshopController.feedbackSummary);
router.post('/:id/feedback', authenticate, validate(feedbackSchema), WorkshopController.submitFeedback);

// Certificates
router.get('/:id/my-certificate', authenticate, WorkshopController.myCertificate);
router.post('/:id/certificates/issue', authenticate, WorkshopController.issueCertificates);
router.get('/certificates/:certificateId/download', authenticate, WorkshopController.downloadCertificate);

// Registration admin (waitlist, bulk, CSV)
router.post('/:id/registrations/bulk', authenticate, validate(bulkActionSchema), WorkshopController.bulkRegistrationAction);
router.post('/:id/registrations/promote-waitlist', authenticate, WorkshopController.promoteWaitlist);
router.get('/:id/registrations/export', authenticate, WorkshopController.exportCsv);

module.exports = { workshopRoutes: router };
