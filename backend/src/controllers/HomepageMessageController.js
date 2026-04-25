const { asyncHandler } = require("../core/asyncHandler");
const { ApiResponse } = require("../core/ApiResponse");
const { ApiError } = require("../core/ApiError");
const { HomepageMessageService } = require("../services/HomepageMessageService");
const { HomepageMessage } = require("../models/HomepageMessage");

const HomepageMessageController = {
  // Create a new homepage message
  createMessage: asyncHandler(async (req, res) => {
    const message = await HomepageMessageService.createMessage(
      req.body,
      req.auth.userId,
      req.auth.roles,
      req.requestMeta.requestId
    );

    return res.status(201).json(
      new ApiResponse(201, message, "Homepage message created successfully")
    );
  }),

  // Get published messages for homepage (public endpoint)
  getPublishedMessages: asyncHandler(async (req, res) => {
    const { messageType } = req.query;
    const messages = await HomepageMessageService.getPublishedMessages(messageType);

    return res.json(
      new ApiResponse(200, messages, "Published messages retrieved successfully")
    );
  }),

  // Get messages created by current user
  getMyMessages: asyncHandler(async (req, res) => {
    const messages = await HomepageMessageService.getMyMessages(req.auth.userId);

    return res.json(
      new ApiResponse(200, messages, "Your messages retrieved successfully")
    );
  }),

  // Get pending messages (admin only)
  getPendingMessages: asyncHandler(async (req, res) => {
    const messages = await HomepageMessageService.getPendingMessages();

    return res.json(
      new ApiResponse(200, messages, "Pending messages retrieved successfully")
    );
  }),

  // Get single message by ID
  getMessageById: asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const message = await HomepageMessage.findById(messageId)
      .populate("authorUserId", "firstName lastName email")
      .populate("approvedBy", "firstName lastName")
      .populate("rejectedBy", "firstName lastName");

    if (!message) {
      throw new ApiError(404, "Message not found");
    }

    return res.json(
      new ApiResponse(200, message, "Message retrieved successfully")
    );
  }),

  // Approve a message
  approveMessage: asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const message = await HomepageMessageService.approveMessage(
      messageId,
      req.auth.userId,
      req.auth.roles,
      req.requestMeta.requestId
    );

    return res.json(
      new ApiResponse(200, message, "Message approved successfully")
    );
  }),

  // Reject a message
  rejectMessage: asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const { rejectionReason } = req.body;
    
    const message = await HomepageMessageService.rejectMessage(
      messageId,
      rejectionReason,
      req.auth.userId,
      req.auth.roles,
      req.requestMeta.requestId
    );

    return res.json(
      new ApiResponse(200, message, "Message rejected successfully")
    );
  }),

  // Update a message
  updateMessage: asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const message = await HomepageMessageService.updateMessage(
      messageId,
      req.body,
      req.auth.userId,
      req.auth.roles,
      req.requestMeta.requestId
    );

    return res.json(
      new ApiResponse(200, message, "Message updated successfully")
    );
  }),

  // Delete a message
  deleteMessage: asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    await HomepageMessageService.deleteMessage(
      messageId,
      req.auth.userId,
      req.auth.roles,
      req.requestMeta.requestId
    );

    return res.json(
      new ApiResponse(200, null, "Message deleted successfully")
    );
  }),

  // Reorder messages (admin only)
  reorderMessages: asyncHandler(async (req, res) => {
    const { messageIds } = req.body;
    const result = await HomepageMessageService.reorderMessages(
      messageIds,
      req.auth.userId,
      req.auth.roles,
      req.requestMeta.requestId
    );

    return res.json(
      new ApiResponse(200, result, "Messages reordered successfully")
    );
  }),

  // Get all messages with filters (admin only)
  getAllMessages: asyncHandler(async (req, res) => {
    const { 
      status, 
      messageType, 
      authorId, 
      page = 1, 
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = req.query;

    const query = { isActive: true };
    
    if (status) query.status = status;
    if (messageType) query.messageType = messageType;
    if (authorId) query.authorUserId = authorId;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

    const [messages, total] = await Promise.all([
      HomepageMessage.find(query)
        .populate("authorUserId", "firstName lastName email")
        .populate("approvedBy", "firstName lastName")
        .populate("rejectedBy", "firstName lastName")
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      HomepageMessage.countDocuments(query)
    ]);

    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    };

    return res.json(
      new ApiResponse(200, { messages, pagination }, "Messages retrieved successfully")
    );
  })
};

module.exports = { HomepageMessageController };