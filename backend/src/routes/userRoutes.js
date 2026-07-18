const express = require("express");
const { UserProfileController } = require("../controllers/UserProfileController");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// User search and directory
router.get("/search", UserProfileController.searchUsers);
router.get("/directory", UserProfileController.getDirectory);

// Profile routes
router.get("/:userId/profile", UserProfileController.getProfile);
router.patch("/profile", UserProfileController.updateOwnProfile);

module.exports = { userRoutes: router };
