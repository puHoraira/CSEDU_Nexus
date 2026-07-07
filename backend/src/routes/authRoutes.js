const express = require("express");
const { AuthController } = require("../controllers/AuthController");
const { validate } = require("../middleware/validate");
const { authenticate } = require("../middleware/auth");
const { authorize } = require("../middleware/authorize");
const { rateLimiter } = require("../middleware/rateLimiter");
const { registerSchema, registerTeacherSchema, loginSchema, updateProfileSchema } = require("../validators/authValidators");

const router = express.Router();

// Authentication routes
router.post("/login", rateLimiter('login'), validate(loginSchema), AuthController.login);
router.post("/refresh", AuthController.refresh);
router.post("/logout", AuthController.logout);

// Email verification routes
router.post("/send-verification", rateLimiter('emailVerification'), authenticate, AuthController.sendVerificationEmail);
router.post("/request-verification", rateLimiter('emailVerification'), AuthController.requestVerificationEmail);
router.post("/verify-email", AuthController.verifyEmail);
router.post("/request-password-reset", rateLimiter('passwordReset'), AuthController.requestPasswordReset);
router.post("/reset-password", AuthController.resetPassword);

// Registration routes - SIMPLE VALIDATION
router.post("/register", 
  rateLimiter('registration'),
  validate(registerSchema),
  AuthController.register
);

router.post("/register-teacher", 
  validate(registerTeacherSchema),
  AuthController.registerTeacher
);

// Profile routes
router.get("/me", authenticate, AuthController.me);

router.patch("/profile", 
  authenticate, 
  validate(updateProfileSchema),
  AuthController.updateProfile
);

// Eligibility routes
router.post("/check-eligibility/:checkType", 
  authenticate,
  AuthController.checkEligibility
);

router.patch("/academic-record", 
  authenticate,
  AuthController.updateAcademicRecord
);

// Admin/Moderator routes for registration management
router.get("/registration-stats", 
  authenticate,
  authorize(["Moderator", "Chief Patron", "President"]),
  AuthController.getRegistrationStats
);

router.get("/eligibility-report", 
  authenticate,
  authorize(["Moderator", "Chief Patron", "Election Commissioner"]),
  AuthController.getEligibilityReport
);

module.exports = { authRoutes: router };
