const { ApiError } = require("../core/ApiError");
const { HomepageMessage } = require("../models/HomepageMessage");
const { User } = require("../models/User");
const { AuditService } = require("./AuditService");
const { NotificationService } = require("./NotificationService");

const MODERATOR_ROLE = "Moderator";
const CHAIRMAN_ROLES = ["Chief Patron", "Chairman"];

class HomepageMessageService {
  static canCreateMessage(roles = []) {
    // Allow EC members, Moderators, and Chairman to create messages
    return roles.some(role => 
      ["President", "Vice President", "General Secretary", "Treasurer", 
       "Secretary (Publication)", "Secretary (Cultural)", "Secretary (Seminars and Workshops)",
       "Secretary (Sports)", "Secretary (Graphics and Media)", "Executive Member",
       "Moderator", "Chief Patron", "Chairman"].includes(role)
    );
  }

  static canApproveMessage(roles = []) {
    return roles.includes(MODERATOR_ROLE) || CHAIRMAN_ROLES.some(role => roles.includes(role));
  }

  static async createMessage(payload, actorId, roles, requestId) {
    if (!this.canCreateMessage(roles)) {
      throw new ApiError(403, "You don't have permission to create homepage messages");
    }

    const user = await User.findById(actorId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // Auto-approve for Moderator and Chairman
    const canAutoApprove = this.canApproveMessage(roles);
    
    const message = await HomepageMessage.create({
      authorUserId: actorId,
      authorName: payload.authorName || `${user.firstName} ${user.lastName}`,
      authorTitle: payload.authorTitle,
      authorDesignation: payload.authorDesignation || "",
      authorImageUrl: payload.authorImageUrl || "",
      message: payload.message,
      displayOrder: payload.displayOrder || 0,
      messageType: payload.messageType || "General",
      backgroundColor: payload.backgroundColor || "",
      textColor: payload.textColor || "",
      metadata: {
        showOnHomepage: payload.showOnHomepage !== false,
        showOnDashboard: payload.showOnDashboard || false,
        allowComments: payload.allowComments || false,
        priority: payload.priority || "Medium"
      },
      expiresAt: payload.expiresAt || null,
      status: canAutoApprove ? "Approved" : "PendingApproval",
      approvedBy: canAutoApprove ? actorId : null,
      approvedAt: canAutoApprove ? new Date() : null,
      isPublished: canAutoApprove,
      publishedAt: canAutoApprove ? new Date() : null
    });

    await AuditService.log({
      actorId,
      action: "HOMEPAGE_MESSAGE_CREATED",
      resource: "HomepageMessage",
      resourceId: message._id.toString(),
      requestId,
      metadata: { messageType: message.messageType, status: message.status }
    });

    if (!canAutoApprove) {
      await NotificationService.createForRoleNames(["Moderator", "Chief Patron"], {
        title: "New homepage message pending approval",
        message: `A ${message.messageType} message from ${message.authorName} is awaiting approval.`,
        category: "System",
        actionUrl: "/dashboard/admin/homepage-messages",
        entityType: "HomepageMessage",
        entityId: message._id.toString()
      });
    }

    return message;
  }

  static async getPublishedMessages(messageType = null) {
    const query = {
      isActive: true,
      isPublished: true,
      status: "Approved",
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ]
    };

    if (messageType) {
      query.messageType = messageType;
    }

    return HomepageMessage.find(query)
      .populate("authorUserId", "firstName lastName email")
      .sort({ displayOrder: 1, publishedAt: -1 })
      .lean();
  }

  static async getMyMessages(actorId) {
    return HomepageMessage.find({ authorUserId: actorId })
      .populate("approvedBy", "firstName lastName")
      .populate("rejectedBy", "firstName lastName")
      .sort({ createdAt: -1 });
  }

  static async getPendingMessages() {
    return HomepageMessage.find({ status: "PendingApproval", isActive: true })
      .populate("authorUserId", "firstName lastName email")
      .sort({ createdAt: 1 });
  }

  static async approveMessage(messageId, actorId, roles, requestId) {
    if (!this.canApproveMessage(roles)) {
      throw new ApiError(403, "You don't have permission to approve messages");
    }

    const message = await HomepageMessage.findById(messageId);
    if (!message) {
      throw new ApiError(404, "Message not found");
    }

    if (message.status !== "PendingApproval") {
      throw new ApiError(409, "Message is not pending approval");
    }

    message.status = "Approved";
    message.approvedBy = actorId;
    message.approvedAt = new Date();
    message.isPublished = true;
    message.publishedAt = new Date();
    await message.save();

    await AuditService.log({
      actorId,
      action: "HOMEPAGE_MESSAGE_APPROVED",
      resource: "HomepageMessage",
      resourceId: message._id.toString(),
      requestId,
      metadata: { messageType: message.messageType }
    });

    await NotificationService.createForUser(message.authorUserId, {
      title: "Homepage message approved",
      message: `Your ${message.messageType} message has been approved and is now live on the homepage.`,
      category: "System",
      actionUrl: "/dashboard/homepage-messages",
      entityType: "HomepageMessage",
      entityId: message._id.toString()
    });

    return message;
  }

  static async rejectMessage(messageId, rejectionReason, actorId, roles, requestId) {
    if (!this.canApproveMessage(roles)) {
      throw new ApiError(403, "You don't have permission to reject messages");
    }

    const message = await HomepageMessage.findById(messageId);
    if (!message) {
      throw new ApiError(404, "Message not found");
    }

    if (message.status !== "PendingApproval") {
      throw new ApiError(409, "Message is not pending approval");
    }

    message.status = "Rejected";
    message.rejectedBy = actorId;
    message.rejectedAt = new Date();
    message.rejectionReason = rejectionReason;
    await message.save();

    await AuditService.log({
      actorId,
      action: "HOMEPAGE_MESSAGE_REJECTED",
      resource: "HomepageMessage",
      resourceId: message._id.toString(),
      requestId,
      metadata: { messageType: message.messageType, rejectionReason }
    });

    await NotificationService.createForUser(message.authorUserId, {
      title: "Homepage message rejected",
      message: `Your ${message.messageType} message was rejected. Reason: ${rejectionReason}`,
      category: "System",
      actionUrl: "/dashboard/homepage-messages",
      entityType: "HomepageMessage",
      entityId: message._id.toString()
    });

    return message;
  }

  static async updateMessage(messageId, payload, actorId, roles, requestId) {
    const message = await HomepageMessage.findById(messageId);
    if (!message) {
      throw new ApiError(404, "Message not found");
    }

    // Only author or admin can update
    const isAuthor = message.authorUserId.toString() === actorId.toString();
    const isAdmin = this.canApproveMessage(roles);
    
    if (!isAuthor && !isAdmin) {
      throw new ApiError(403, "You can only update your own messages");
    }

    // If message was approved and author is updating, reset to pending
    if (isAuthor && message.status === "Approved" && !isAdmin) {
      message.status = "PendingApproval";
      message.isPublished = false;
      message.publishedAt = null;
      message.approvedBy = null;
      message.approvedAt = null;
    }

    // Update fields
    if (payload.authorName !== undefined) message.authorName = payload.authorName;
    if (payload.authorTitle !== undefined) message.authorTitle = payload.authorTitle;
    if (payload.authorDesignation !== undefined) message.authorDesignation = payload.authorDesignation;
    if (payload.authorImageUrl !== undefined) message.authorImageUrl = payload.authorImageUrl;
    if (payload.message !== undefined) message.message = payload.message;
    if (payload.displayOrder !== undefined) message.displayOrder = payload.displayOrder;
    if (payload.messageType !== undefined) message.messageType = payload.messageType;
    if (payload.backgroundColor !== undefined) message.backgroundColor = payload.backgroundColor;
    if (payload.textColor !== undefined) message.textColor = payload.textColor;
    if (payload.expiresAt !== undefined) message.expiresAt = payload.expiresAt;
    
    if (payload.showOnHomepage !== undefined) message.metadata.showOnHomepage = payload.showOnHomepage;
    if (payload.showOnDashboard !== undefined) message.metadata.showOnDashboard = payload.showOnDashboard;
    if (payload.allowComments !== undefined) message.metadata.allowComments = payload.allowComments;
    if (payload.priority !== undefined) message.metadata.priority = payload.priority;

    await message.save();

    await AuditService.log({
      actorId,
      action: "HOMEPAGE_MESSAGE_UPDATED",
      resource: "HomepageMessage",
      resourceId: message._id.toString(),
      requestId,
      metadata: { messageType: message.messageType, status: message.status }
    });

    return message;
  }

  static async deleteMessage(messageId, actorId, roles, requestId) {
    const message = await HomepageMessage.findById(messageId);
    if (!message) {
      throw new ApiError(404, "Message not found");
    }

    // Only author or admin can delete
    const isAuthor = message.authorUserId.toString() === actorId.toString();
    const isAdmin = this.canApproveMessage(roles);
    
    if (!isAuthor && !isAdmin) {
      throw new ApiError(403, "You can only delete your own messages");
    }

    message.isActive = false;
    message.isPublished = false;
    await message.save();

    await AuditService.log({
      actorId,
      action: "HOMEPAGE_MESSAGE_DELETED",
      resource: "HomepageMessage",
      resourceId: message._id.toString(),
      requestId,
      metadata: { messageType: message.messageType }
    });

    return message;
  }

  static async reorderMessages(messageIds, actorId, roles, requestId) {
    if (!this.canApproveMessage(roles)) {
      throw new ApiError(403, "You don't have permission to reorder messages");
    }

    const updatePromises = messageIds.map((messageId, index) => 
      HomepageMessage.findByIdAndUpdate(messageId, { displayOrder: index })
    );

    await Promise.all(updatePromises);

    await AuditService.log({
      actorId,
      action: "HOMEPAGE_MESSAGES_REORDERED",
      resource: "HomepageMessage",
      resourceId: "bulk",
      requestId,
      metadata: { messageCount: messageIds.length }
    });

    return { success: true, reorderedCount: messageIds.length };
  }
}

module.exports = { HomepageMessageService };