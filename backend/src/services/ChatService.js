const { ChatMessage } = require("../models/ChatMessage");
const { ChatConversation } = require("../models/ChatConversation");
const { User } = require("../models/User");
const { ApiError } = require("../core/ApiError");
const { NotificationService } = require("./NotificationService");

class ChatService {
  /**
   * Send a message to another user
   */
  static async sendMessage(senderId, receiverId, data) {
    const { content, images = [], replyToMessageId = null } = data;

    // Verify receiver exists and is active
    const receiver = await User.findOne({ _id: receiverId, isActive: true });
    if (!receiver) {
      throw new ApiError(404, "Recipient not found or inactive");
    }

    // Check user's privacy settings
    if (receiver.privacySettings?.allowDirectMessages === false) {
      throw new ApiError(403, "This user has disabled direct messages");
    }

    // Create the message
    const message = await ChatMessage.create({
      senderId,
      receiverId,
      content,
      images,
      replyToMessageId
    });

    await message.populate([
      { path: "senderId", select: "firstName lastName avatarUrl" },
      { path: "receiverId", select: "firstName lastName avatarUrl" }
    ]);

    // Update or create conversation
    const participants = ChatConversation.getConversationId(senderId, receiverId);
    
    let conversation = await ChatConversation.findOne({ participants });
    
    if (!conversation) {
      conversation = await ChatConversation.create({
        participants,
        lastMessageId: message._id,
        lastMessageContent: content.substring(0, 200),
        lastMessageAt: message.createdAt,
        unreadCount: new Map([[receiverId.toString(), 1]])
      });
    } else {
      conversation.lastMessageId = message._id;
      conversation.lastMessageContent = content.substring(0, 200);
      conversation.lastMessageAt = message.createdAt;
      
      // Increment unread count for receiver
      const receiverIdStr = receiverId.toString();
      const currentUnread = conversation.unreadCount.get(receiverIdStr) || 0;
      conversation.unreadCount.set(receiverIdStr, currentUnread + 1);
      
      await conversation.save();
    }

    // Send notification to receiver
    const sender = await User.findById(senderId).select("firstName lastName");
    await NotificationService.createForUser(receiverId, {
      title: "New message",
      message: `${sender.firstName} ${sender.lastName} sent you a message`,
      category: "Chat",
      priority: "Normal",
      actionUrl: `/dashboard/chat/${senderId}`,
      entityType: "ChatMessage",
      entityId: message._id,
      sentBy: senderId
    });

    return message;
  }

  /**
   * Get conversation with another user
   */
  static async getConversation(userId, otherUserId, { page = 1, limit = 50 } = {}) {
    const skip = (page - 1) * limit;

    // Verify other user exists
    const otherUser = await User.findById(otherUserId).select("firstName lastName avatarUrl bio designation");
    if (!otherUser) {
      throw new ApiError(404, "User not found");
    }

    // Get messages between the two users (bidirectional)
    const messages = await ChatMessage.find({
      $or: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId }
      ],
      isDeleted: false
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("senderId", "firstName lastName avatarUrl")
      .populate("receiverId", "firstName lastName avatarUrl")
      .populate("replyToMessageId", "content senderId")
      .lean();

    // Reverse to show oldest first
    messages.reverse();

    const total = await ChatMessage.countDocuments({
      $or: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId }
      ],
      isDeleted: false
    });

    // Mark messages as read
    await this.markMessagesAsRead(userId, otherUserId);

    return {
      messages,
      otherUser,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get all conversations for a user
   */
  static async getConversations(userId, { page = 1, limit = 20 } = {}) {
    const skip = (page - 1) * limit;

    // Find all conversations where user is a participant
    const conversations = await ChatConversation.find({
      participants: userId
    })
      .sort({ lastMessageAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("participants", "firstName lastName avatarUrl bio")
      .populate("lastMessageId", "content senderId createdAt");
      // Removed .lean() to preserve Map functionality

    // Format conversations with other participant info and unread count
    const formattedConversations = conversations.map(conv => {
      const otherParticipant = conv.participants.find(
        p => p._id.toString() !== userId.toString()
      );
      
      // Now unreadCount is a proper Map
      const unreadCount = conv.unreadCount instanceof Map 
        ? (conv.unreadCount.get(userId.toString()) || 0)
        : 0;

      return {
        id: conv._id,
        otherUser: otherParticipant,
        lastMessage: conv.lastMessageId,
        lastMessageContent: conv.lastMessageContent,
        lastMessageAt: conv.lastMessageAt,
        unreadCount
      };
    });

    const total = await ChatConversation.countDocuments({
      participants: userId
    });

    return {
      conversations: formattedConversations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Mark messages as read
   */
  static async markMessagesAsRead(userId, senderId) {
    // Update all unread messages from sender to user
    const result = await ChatMessage.updateMany(
      {
        senderId: senderId,
        receiverId: userId,
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );

    // Update conversation unread count
    const participants = ChatConversation.getConversationId(userId, senderId);
    const conversation = await ChatConversation.findOne({ participants });
    
    if (conversation) {
      conversation.unreadCount.set(userId.toString(), 0);
      await conversation.save();
    }

    return { markedAsRead: result.modifiedCount };
  }

  /**
   * Get total unread message count for a user
   */
  static async getUnreadCount(userId) {
    const conversations = await ChatConversation.find({
      participants: userId
    }).select("unreadCount");

    let total = 0;
    conversations.forEach(conv => {
      const count = conv.unreadCount instanceof Map
        ? (conv.unreadCount.get(userId.toString()) || 0)
        : 0;
      total += count;
    });

    return { unreadCount: total };
  }

  /**
   * Delete a message (soft delete)
   */
  static async deleteMessage(messageId, userId) {
    const message = await ChatMessage.findOne({ 
      _id: messageId,
      isDeleted: false
    });

    if (!message) {
      throw new ApiError(404, "Message not found");
    }

    // Only sender can delete
    if (message.senderId.toString() !== userId.toString()) {
      throw new ApiError(403, "You can only delete your own messages");
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    message.deletedBy = userId;
    await message.save();

    return { message: "Message deleted successfully" };
  }

  /**
   * Edit a message
   */
  static async editMessage(messageId, userId, newContent) {
    const message = await ChatMessage.findOne({ 
      _id: messageId,
      isDeleted: false
    });

    if (!message) {
      throw new ApiError(404, "Message not found");
    }

    // Only sender can edit
    if (message.senderId.toString() !== userId.toString()) {
      throw new ApiError(403, "You can only edit your own messages");
    }

    message.content = newContent;
    message.isEdited = true;
    message.lastEditedAt = new Date();
    await message.save();

    await message.populate([
      { path: "senderId", select: "firstName lastName avatarUrl" },
      { path: "receiverId", select: "firstName lastName avatarUrl" }
    ]);

    return message;
  }

  /**
   * Set typing indicator
   */
  static async setTyping(userId, otherUserId, isTyping) {
    const participants = ChatConversation.getConversationId(userId, otherUserId);
    let conversation = await ChatConversation.findOne({ participants });

    if (!conversation) {
      // Create conversation if it doesn't exist
      conversation = await ChatConversation.create({
        participants,
        unreadCount: new Map()
      });
    }

    if (isTyping) {
      // Add or update typing indicator
      const existingIndex = conversation.typingUsers.findIndex(
        tu => tu.userId.toString() === userId.toString()
      );
      
      if (existingIndex >= 0) {
        conversation.typingUsers[existingIndex].startedAt = new Date();
      } else {
        conversation.typingUsers.push({
          userId,
          startedAt: new Date()
        });
      }
    } else {
      // Remove typing indicator
      conversation.typingUsers = conversation.typingUsers.filter(
        tu => tu.userId.toString() !== userId.toString()
      );
    }

    await conversation.save();

    return { typing: isTyping };
  }

  /**
   * Search messages in a conversation
   */
  static async searchMessages(userId, otherUserId, query, { page = 1, limit = 20 } = {}) {
    const skip = (page - 1) * limit;

    const messages = await ChatMessage.find({
      $or: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId }
      ],
      isDeleted: false,
      content: { $regex: query, $options: 'i' }
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("senderId", "firstName lastName avatarUrl")
      .populate("receiverId", "firstName lastName avatarUrl")
      .lean();

    const total = await ChatMessage.countDocuments({
      $or: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId }
      ],
      isDeleted: false,
      content: { $regex: query, $options: 'i' }
    });

    return {
      messages,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Delete entire conversation (for current user only)
   */
  static async deleteConversation(userId, otherUserId) {
    // Soft delete all messages where user is sender
    await ChatMessage.updateMany(
      {
        senderId: userId,
        receiverId: otherUserId,
        isDeleted: false
      },
      {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: userId
      }
    );

    return { message: "Conversation deleted successfully" };
  }
}

module.exports = { ChatService };
