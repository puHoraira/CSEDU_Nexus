const { ChatService } = require("../services/ChatService");
const { asyncHandler } = require("../core/asyncHandler");
const { ApiResponse } = require("../core/ApiResponse");

class ChatController {
  /**
   * Send a message
   * POST /api/chat/messages
   */
  static sendMessage = asyncHandler(async (req, res) => {
    const senderId = req.auth.userId;
    const { receiverId, content, images, replyToMessageId } = req.body;
    
    const message = await ChatService.sendMessage(senderId, receiverId, {
      content,
      images,
      replyToMessageId
    });
    
    return ApiResponse.created(res, message, "Message sent successfully");
  });

  /**
   * Get conversation with another user
   * GET /api/chat/conversations/:userId
   */
  static getConversation = asyncHandler(async (req, res) => {
    const userId = req.auth.userId;
    const { userId: otherUserId } = req.params;
    const { page, limit } = req.query;
    
    const result = await ChatService.getConversation(userId, otherUserId, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50
    });
    
    return ApiResponse.ok(res, result, "Conversation retrieved successfully");
  });

  /**
   * Get all conversations
   * GET /api/chat/conversations
   */
  static getConversations = asyncHandler(async (req, res) => {
    const userId = req.auth.userId;
    const { page, limit } = req.query;
    
    const result = await ChatService.getConversations(userId, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20
    });
    
    return ApiResponse.ok(res, result, "Conversations retrieved successfully");
  });

  /**
   * Mark messages as read
   * POST /api/chat/conversations/:userId/read
   */
  static markAsRead = asyncHandler(async (req, res) => {
    const userId = req.auth.userId;
    const { userId: senderId } = req.params;
    
    const result = await ChatService.markMessagesAsRead(userId, senderId);
    
    return ApiResponse.ok(res, result, "Messages marked as read");
  });

  /**
   * Get unread count
   * GET /api/chat/unread-count
   */
  static getUnreadCount = asyncHandler(async (req, res) => {
    const userId = req.auth.userId;
    
    const result = await ChatService.getUnreadCount(userId);
    
    return ApiResponse.ok(res, result, "Unread count retrieved successfully");
  });

  /**
   * Delete a message
   * DELETE /api/chat/messages/:messageId
   */
  static deleteMessage = asyncHandler(async (req, res) => {
    const userId = req.auth.userId;
    const { messageId } = req.params;
    
    const result = await ChatService.deleteMessage(messageId, userId);
    
    return ApiResponse.ok(res, result, "Message deleted successfully");
  });

  /**
   * Edit a message
   * PATCH /api/chat/messages/:messageId
   */
  static editMessage = asyncHandler(async (req, res) => {
    const userId = req.auth.userId;
    const { messageId } = req.params;
    const { content } = req.body;
    
    const message = await ChatService.editMessage(messageId, userId, content);
    
    return ApiResponse.ok(res, message, "Message updated successfully");
  });

  /**
   * Set typing indicator
   * POST /api/chat/conversations/:userId/typing
   */
  static setTyping = asyncHandler(async (req, res) => {
    const userId = req.auth.userId;
    const { userId: otherUserId } = req.params;
    const { isTyping } = req.body;
    
    const result = await ChatService.setTyping(userId, otherUserId, isTyping);
    
    return ApiResponse.ok(res, result, "Typing status updated");
  });

  /**
   * Search messages
   * GET /api/chat/conversations/:userId/search
   */
  static searchMessages = asyncHandler(async (req, res) => {
    const userId = req.auth.userId;
    const { userId: otherUserId } = req.params;
    const { q, page, limit } = req.query;
    
    if (!q || q.length < 2) {
      return ApiResponse.ok(res, { messages: [], pagination: {} }, "Query too short");
    }
    
    const result = await ChatService.searchMessages(userId, otherUserId, q, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20
    });
    
    return ApiResponse.ok(res, result, "Messages found");
  });

  /**
   * Delete conversation
   * DELETE /api/chat/conversations/:userId
   */
  static deleteConversation = asyncHandler(async (req, res) => {
    const userId = req.auth.userId;
    const { userId: otherUserId } = req.params;
    
    const result = await ChatService.deleteConversation(userId, otherUserId);
    
    return ApiResponse.ok(res, result, "Conversation deleted successfully");
  });
}

module.exports = { ChatController };
