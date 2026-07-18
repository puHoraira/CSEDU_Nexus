const express = require("express");
const { ChatController } = require("../controllers/ChatController");
const { authenticate } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const {
  sendMessageSchema,
  editMessageSchema,
  setTypingSchema
} = require("../validators/chatValidators");

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Message routes
router.post("/messages", validate(sendMessageSchema), ChatController.sendMessage);
router.patch("/messages/:messageId", validate(editMessageSchema), ChatController.editMessage);
router.delete("/messages/:messageId", ChatController.deleteMessage);

// Conversation routes
router.get("/conversations", ChatController.getConversations);
router.get("/conversations/:userId", ChatController.getConversation);
router.post("/conversations/:userId/read", ChatController.markAsRead);
router.post("/conversations/:userId/typing", validate(setTypingSchema), ChatController.setTyping);
router.get("/conversations/:userId/search", ChatController.searchMessages);
router.delete("/conversations/:userId", ChatController.deleteConversation);

// Unread count
router.get("/unread-count", ChatController.getUnreadCount);

module.exports = { chatRoutes: router };
