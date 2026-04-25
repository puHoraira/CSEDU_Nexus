const { ApiResponse }    = require('../core/ApiResponse');
const { asyncHandler }   = require('../core/asyncHandler');
const { WorkshopService } = require('../services/WorkshopService');

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

class WorkshopController {
  // ── Workshop CRUD ──────────────────────────────────────────────────────────

  static list = asyncHandler(async (req, res) => {
    const workshops = await WorkshopService.listWorkshops(req.query);
    return ApiResponse.ok(res, workshops, 'Workshops');
  });

  static detail = asyncHandler(async (req, res) => {
    const workshop = await WorkshopService.getWorkshopById(req.params.id);
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
    const workshop = await WorkshopService.addMaterial(req.params.id, req.body);
    return ApiResponse.ok(res, workshop, 'Material added');
  });

  static removeMaterial = asyncHandler(async (req, res) => {
    const workshop = await WorkshopService.removeMaterial(req.params.id, parseInt(req.params.index));
    return ApiResponse.ok(res, workshop, 'Material removed');
  });
}

module.exports = { WorkshopController };
