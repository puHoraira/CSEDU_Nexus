const { ApiResponse } = require("../core/ApiResponse");
const { asyncHandler } = require("../core/asyncHandler");
const { EventRegistrationService } = require("../services/EventRegistrationService");

class EventRegistrationController {
  static register = asyncHandler(async (req, res) => {
    const registration = await EventRegistrationService.registerForEvent(
      req.params.eventId,
      req.body,
      req.auth.userId,
      req.requestMeta.requestId
    );
    return ApiResponse.created(res, registration, "Registration successful");
  });

  static initiatePayment = asyncHandler(async (req, res) => {
    const result = await EventRegistrationService.initiatePayment(
      req.params.registrationId,
      req.auth.userId,
      req.requestMeta.requestId
    );
    return ApiResponse.ok(res, result, "Payment initiated");
  });

  static verifyPayment = asyncHandler(async (req, res) => {
    const result = await EventRegistrationService.verifyPayment(
      req.params.registrationId,
      req.body,
      req.requestMeta.requestId
    );
    return ApiResponse.ok(res, result, "Payment verified");
  });

  static cancelRegistration = asyncHandler(async (req, res) => {
    const registration = await EventRegistrationService.cancelRegistration(
      req.params.registrationId,
      req.auth.userId,
      req.body.reason,
      req.requestMeta.requestId
    );
    return ApiResponse.ok(res, registration, "Registration cancelled");
  });

  static getRegistration = asyncHandler(async (req, res) => {
    const registration = await EventRegistrationService.getRegistration(
      req.params.registrationId,
      req.auth.userId
    );
    return ApiResponse.ok(res, registration, "Registration details");
  });

  static getUserRegistrations = asyncHandler(async (req, res) => {
    const registrations = await EventRegistrationService.getUserRegistrations(req.auth.userId);
    return ApiResponse.ok(res, registrations, "User registrations");
  });

  static getEventRegistrations = asyncHandler(async (req, res) => {
    const registrations = await EventRegistrationService.getEventRegistrations(req.params.eventId);
    return ApiResponse.ok(res, registrations, "Event registrations");
  });

  // Payment gateway callbacks
  static bkashCallback = asyncHandler(async (req, res) => {
    const { paymentID, status } = req.query;
    
    if (status === "success") {
      // Redirect to frontend with payment info
      res.redirect(`${process.env.FRONTEND_URL}/dashboard/events/payment/verify?paymentID=${paymentID}&gateway=bkash`);
    } else {
      res.redirect(`${process.env.FRONTEND_URL}/dashboard/events/payment/failed?reason=${status}`);
    }
  });

  static sslcommerzSuccess = asyncHandler(async (req, res) => {
    const { val_id, tran_id } = req.body;
    
    // Redirect to frontend with payment info
    res.redirect(`${process.env.FRONTEND_URL}/dashboard/events/payment/verify?val_id=${val_id}&tran_id=${tran_id}&gateway=sslcommerz`);
  });

  static sslcommerzFail = asyncHandler(async (req, res) => {
    const { error } = req.body;
    res.redirect(`${process.env.FRONTEND_URL}/dashboard/events/payment/failed?reason=${error}`);
  });

  static sslcommerzCancel = asyncHandler(async (req, res) => {
    res.redirect(`${process.env.FRONTEND_URL}/dashboard/events/payment/cancelled`);
  });
}

module.exports = { EventRegistrationController };
