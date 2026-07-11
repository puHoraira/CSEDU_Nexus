const { Workshop } = require("../models/Workshop");
const { WorkshopPost } = require("../models/WorkshopPost");
const { WorkshopComment } = require("../models/WorkshopComment");
const { WorkshopRegistration } = require("../models/WorkshopRegistration");
const { UserRole } = require("../models/UserRole");
const { ApiError } = require("../core/ApiError");
const { AuditService } = require("./AuditService");
const { NotificationService } = require("./NotificationService");

const MANAGER_ROLES = ["President", "Vice President", "General Secretary", "AGS (Organization)", "Moderator", "System Admin", "Chief Patron"];

class WorkshopFeedService {
  static async resolveRoles(userId) {
    const records = await UserRole.find({ userId }).populate("roleId");
    return records.map((r) => r.roleId?.roleName).filter(Boolean);
  }

  static async isManager(workshop, userId) {
    if (!userId) return false;
    const creatorId = workshop.createdBy?._id?.toString?.() || workshop.createdBy?.toString?.();
    if (creatorId && creatorId === userId.toString()) return true;
    const roles = await this.resolveRoles(userId);
    return roles.some((r) => MANAGER_ROLES.includes(r));
  }

  static async listFeed(workshopId) {
    const workshop = await Workshop.findById(workshopId).select("_id");
    if (!workshop) throw new ApiError(404, "Workshop not found");

    const [posts, comments] = await Promise.all([
      WorkshopPost.find({ workshopId })
        .populate("authorId", "firstName lastName email avatarUrl")
        .sort({ createdAt: -1 }),
      WorkshopComment.find({ workshopId })
        .populate("authorId", "firstName lastName email avatarUrl")
        .sort({ createdAt: 1 }),
    ]);

    const commentsByPost = comments.reduce((acc, c) => {
      const key = c.postId.toString();
      (acc[key] = acc[key] || []).push(c);
      return acc;
    }, {});

    return posts.map((post) => ({
      ...post.toObject(),
      comments: commentsByPost[post._id.toString()] || [],
    }));
  }

  static async createPost(workshopId, payload, authorId, requestId) {
    const workshop = await Workshop.findById(workshopId).select("_id title createdBy");
    if (!workshop) throw new ApiError(404, "Workshop not found");

    const manager = await this.isManager(workshop, authorId);

    // Announcements are manager-only. Regular discussion is open to
    // registered participants and managers.
    if (payload.isAnnouncement && !manager) {
      throw new ApiError(403, "Only organizers can post announcements.");
    }
    if (!manager) {
      const reg = await WorkshopRegistration.findOne({
        workshopId,
        userId: authorId,
        status: { $in: ["Approved", "Attended", "Pending", "Waitlisted"] },
      }).select("_id");
      if (!reg) {
        throw new ApiError(403, "Register for this workshop to join the discussion.");
      }
    }

    const post = await WorkshopPost.create({
      workshopId,
      authorId,
      content: payload.content,
      images: payload.images || [],
      isAnnouncement: Boolean(payload.isAnnouncement),
    });

    await AuditService.log({
      actorId: authorId,
      action: "WORKSHOP_POST_CREATED",
      resource: "WorkshopPost",
      resourceId: post._id.toString(),
      requestId,
      metadata: { workshopId, isAnnouncement: post.isAnnouncement },
    }).catch(() => {});

    // Notify registered participants of manager announcements.
    if (post.isAnnouncement) {
      const regs = await WorkshopRegistration.find({
        workshopId,
        status: { $in: ["Approved", "Attended"] },
      }).select("userId");
      const recipientIds = regs.map((r) => r.userId?.toString()).filter((uid) => uid && uid !== authorId.toString());
      if (recipientIds.length) {
        await NotificationService.createForUsers(recipientIds, {
          title: `📢 Announcement in ${workshop.title}`,
          message: payload.content.substring(0, 150) + (payload.content.length > 150 ? "…" : ""),
          category: "Workshop",
          actionUrl: `/dashboard/workshops/${workshopId}`,
          entityType: "WorkshopPost",
          entityId: post._id.toString(),
        }).catch(() => {});
      }
    }

    return post.populate("authorId", "firstName lastName email avatarUrl");
  }

  static async addComment(workshopId, postId, payload, authorId, requestId) {
    const [workshop, post] = await Promise.all([
      Workshop.findById(workshopId).select("_id title createdBy"),
      WorkshopPost.findOne({ _id: postId, workshopId }).select("_id authorId"),
    ]);
    if (!workshop) throw new ApiError(404, "Workshop not found");
    if (!post) throw new ApiError(404, "Post not found");

    const manager = await this.isManager(workshop, authorId);
    if (!manager) {
      const reg = await WorkshopRegistration.findOne({
        workshopId,
        userId: authorId,
        status: { $in: ["Approved", "Attended", "Pending", "Waitlisted"] },
      }).select("_id");
      if (!reg) throw new ApiError(403, "Register for this workshop to comment.");
    }

    const comment = await WorkshopComment.create({ workshopId, postId, authorId, content: payload.content });
    await WorkshopPost.findByIdAndUpdate(postId, { $inc: { "stats.totalComments": 1 } });

    await AuditService.log({
      actorId: authorId,
      action: "WORKSHOP_COMMENT_CREATED",
      resource: "WorkshopComment",
      resourceId: comment._id.toString(),
      requestId,
      metadata: { workshopId, postId },
    }).catch(() => {});

    const postAuthorId = post.authorId?.toString();
    if (postAuthorId && postAuthorId !== authorId.toString()) {
      await NotificationService.createForUser(postAuthorId, {
        title: "💬 New reply on your post",
        message: payload.content.substring(0, 150) + (payload.content.length > 150 ? "…" : ""),
        category: "Workshop",
        actionUrl: `/dashboard/workshops/${workshopId}`,
        entityType: "WorkshopComment",
        entityId: comment._id.toString(),
      }).catch(() => {});
    }

    return comment.populate("authorId", "firstName lastName email avatarUrl");
  }
}

module.exports = { WorkshopFeedService };
