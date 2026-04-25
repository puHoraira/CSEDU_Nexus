const express = require("express");
const { HomepageMessageController } = require("../controllers/HomepageMessageController");
const { homepageMessageValidators } = require("../validators/homepageMessageValidators");
const { validate } = require("../middleware/validate");
const { authenticate } = require("../middleware/auth");
const { authorize } = require("../middleware/authorize");

const router = express.Router();

// Public routes
router.get(
  "/published",
  validate(homepageMessageValidators.getPublishedMessages, "query"),
  HomepageMessageController.getPublishedMessages
);

// Protected routes - require authentication
router.use(authenticate);

// Routes for EC members and above (can create messages)
router.post(
  "/",
  authorize(["President", "Vice President", "General Secretary", "Assistant General Secretary (Organization)", 
           "Assistant General Secretary (Public Relations)", "Treasurer", "Secretary (Publication)", 
           "Secretary (Sports)", "Secretary (Seminars and Workshops)", "Secretary (Cultural)", 
           "Secretary (Graphics and Media)", "Executive Member", "Moderator", "Chief Patron", "Chairman"]),
  validate(homepageMessageValidators.createMessage),
  HomepageMessageController.createMessage
);

// Get current user's messages
router.get(
  "/my-messages",
  HomepageMessageController.getMyMessages
);

// Get single message by ID
router.get(
  "/:messageId",
  validate(homepageMessageValidators.messageId, "params"),
  HomepageMessageController.getMessageById
);

// Update message (author or admin)
router.put(
  "/:messageId",
  validate(homepageMessageValidators.messageId, "params"),
  validate(homepageMessageValidators.updateMessage),
  HomepageMessageController.updateMessage
);

// Delete message (author or admin)
router.delete(
  "/:messageId",
  validate(homepageMessageValidators.messageId, "params"),
  HomepageMessageController.deleteMessage
);

// Admin routes - require Moderator or Chairman role
router.get(
  "/admin/pending",
  authorize(["Moderator", "Chief Patron", "Chairman"]),
  HomepageMessageController.getPendingMessages
);

router.get(
  "/admin/all",
  authorize(["Moderator", "Chief Patron", "Chairman"]),
  validate(homepageMessageValidators.getAllMessages, "query"),
  HomepageMessageController.getAllMessages
);

router.post(
  "/:messageId/approve",
  authorize(["Moderator", "Chief Patron", "Chairman"]),
  validate(homepageMessageValidators.messageId, "params"),
  HomepageMessageController.approveMessage
);

router.post(
  "/:messageId/reject",
  authorize(["Moderator", "Chief Patron", "Chairman"]),
  validate(homepageMessageValidators.messageId, "params"),
  validate(homepageMessageValidators.rejectMessage),
  HomepageMessageController.rejectMessage
);

router.post(
  "/admin/reorder",
  authorize(["Moderator", "Chief Patron", "Chairman"]),
  validate(homepageMessageValidators.reorderMessages),
  HomepageMessageController.reorderMessages
);

module.exports = router;