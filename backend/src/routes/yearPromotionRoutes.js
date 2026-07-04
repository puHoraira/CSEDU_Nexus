const express = require("express");
const { YearPromotionController } = require("../controllers/YearPromotionController");
const { authenticate } = require("../middleware/auth");
const { authorize } = require("../middleware/authorize");

const router = express.Router();

// All routes require authentication and moderator/admin privileges
router.use(authenticate);
router.use(authorize(["Moderator", "Chief Patron", "President"]));

// Get promotion preview for a year level
router.get("/preview/:yearLevel", YearPromotionController.getPromotionPreview);

// Get year-wise statistics
router.get("/stats", YearPromotionController.getYearWiseStats);

// Bulk promote all students in a year level
router.post("/bulk-promote", YearPromotionController.bulkPromoteYear);

// Promote individual student
router.post("/promote/:memberId", YearPromotionController.promoteIndividualStudent);

// Retain student in current year (failed)
router.post("/retain/:memberId", YearPromotionController.retainStudent);

// Clear retention status
router.post("/clear-retention/:memberId", YearPromotionController.clearRetentionStatus);

// Rollback last promotion
router.post("/rollback/:memberId", YearPromotionController.rollbackPromotion);

module.exports = { yearPromotionRoutes: router };
