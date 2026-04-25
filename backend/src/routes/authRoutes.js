const express = require("express");
const { AuthController } = require("../controllers/AuthController");
const { validate } = require("../middleware/validate");
const { authenticate } = require("../middleware/auth");
const { authorize } = require("../middleware/authorize");
const { registerSchema, registerTeacherSchema, loginSchema, updateProfileSchema } = require("../validators/authValidators");

const router = express.Router();

// Authentication routes
router.post("/login", validate(loginSchema), AuthController.login);
router.post("/refresh", AuthController.refresh);
router.post("/logout", AuthController.logout);

// Registration routes - SIMPLE VALIDATION
router.post("/register", 
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
