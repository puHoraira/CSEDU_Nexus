const express = require("express");
const { AuthController } = require("../controllers/AuthController");
const { validate } = require("../middleware/validate");
const { authenticate } = require("../middleware/auth");
const { registerSchema, registerTeacherSchema, loginSchema, updateProfileSchema } = require("../validators/authValidators");

const router = express.Router();

router.post("/register", validate(registerSchema), AuthController.register);
router.post("/register-teacher", validate(registerTeacherSchema), AuthController.registerTeacher);
router.post("/login", validate(loginSchema), AuthController.login);
router.post("/refresh", AuthController.refresh);
router.get("/me", authenticate, AuthController.me);
router.patch("/profile", authenticate, validate(updateProfileSchema), AuthController.updateProfile);

module.exports = { authRoutes: router };
