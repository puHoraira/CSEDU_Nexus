const express = require("express");
const { EventRegistrationController } = require("../controllers/EventRegistrationController");
const { authenticate } = require("../middleware/auth");
const { authorize } = require("../middleware/authorize");

const router = express.Router();

// Public routes (payment gateway callbacks)
router.get("/payments/bkash/callback", EventRegistrationController.bkashCallback);
router.post("/payments/sslcommerz/success", EventRegistrationController.sslcommerzSuccess);
router.post("/payments/sslcommerz/fail", EventRegistrationController.sslcommerzFail);
router.post("/payments/sslcommerz/cancel", EventRegistrationController.sslcommerzCancel);

// Protected routes
router.use(authenticate);

// User registration routes
router.post("/events/:eventId/register", EventRegistrationController.register);
router.get("/registrations/my", EventRegistrationController.getUserRegistrations);
router.get("/registrations/:registrationId", EventRegistrationController.getRegistration);
router.post("/registrations/:registrationId/payment/initiate", EventRegistrationController.initiatePayment);
router.post("/registrations/:registrationId/payment/verify", EventRegistrationController.verifyPayment);
router.post("/registrations/:registrationId/cancel", EventRegistrationController.cancelRegistration);

// Organizer routes
router.get(
  "/events/:eventId/registrations",
  authorize("event.manage"),
  EventRegistrationController.getEventRegistrations
);

module.exports = router;
