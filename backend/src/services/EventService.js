const { Event } = require("../models/Event");
const { EventPost } = require("../models/EventPost");
const { EventComment } = require("../models/EventComment");
const { Volunteer } = require("../models/Volunteer");
const { Member } = require("../models/Member");
const { ApiError } = require("../core/ApiError");
const { AuditService } = require("./AuditService");

class EventService {
  static async createEvent(payload, userId) {
    return Event.create({ ...payload, createdBy: userId });
  }

  static async getEventById(eventId) {
    const event = await Event.findById(eventId).populate("createdBy", "firstName lastName email");
    if (!event) {
      throw new ApiError(404, "Event not found");
    }
    return event;
  }

  static async listEvents() {
    return Event.find({}).sort({ eventDate: 1 });
  }

  static async listEventFeed(eventId) {
    const event = await Event.findById(eventId).select("_id");
    if (!event) {
      throw new ApiError(404, "Event not found");
    }

    const [posts, comments] = await Promise.all([
      EventPost.find({ eventId })
        .populate("authorId", "firstName lastName email avatarUrl")
        .sort({ createdAt: -1 }),
      EventComment.find({ eventId })
        .populate("authorId", "firstName lastName email avatarUrl")
        .sort({ createdAt: 1 }),
    ]);

    const commentsByPostId = comments.reduce((acc, comment) => {
      const key = comment.postId.toString();
      if (!acc[key]) acc[key] = [];
      acc[key].push(comment);
      return acc;
    }, {});

    return posts.map((post) => ({
      ...post.toObject(),
      comments: commentsByPostId[post._id.toString()] || [],
    }));
  }

  static async createEventPost(eventId, payload, authorId, requestId) {
    const event = await Event.findById(eventId).select("_id");
    if (!event) {
      throw new ApiError(404, "Event not found");
    }

    const post = await EventPost.create({
      eventId,
      authorId,
      content: payload.content,
    });

    await AuditService.log({
      actorId: authorId,
      action: "EVENT_UPDATE_POST_CREATED",
      resource: "EventPost",
      resourceId: post._id.toString(),
      requestId,
      metadata: { eventId },
    });

    return post.populate("authorId", "firstName lastName email avatarUrl");
  }

  static async addEventComment(eventId, postId, payload, authorId, requestId) {
    const [event, post] = await Promise.all([
      Event.findById(eventId).select("_id"),
      EventPost.findOne({ _id: postId, eventId }).select("_id"),
    ]);

    if (!event) {
      throw new ApiError(404, "Event not found");
    }

    if (!post) {
      throw new ApiError(404, "Event update post not found");
    }

    const comment = await EventComment.create({
      eventId,
      postId,
      authorId,
      content: payload.content,
    });

    await AuditService.log({
      actorId: authorId,
      action: "EVENT_UPDATE_COMMENT_CREATED",
      resource: "EventComment",
      resourceId: comment._id.toString(),
      requestId,
      metadata: { eventId, postId },
    });

    return comment.populate("authorId", "firstName lastName email avatarUrl");
  }

  static async applyAsVolunteer(eventId, payload, userId, requestId) {
    const [event, member] = await Promise.all([
      Event.findById(eventId),
      Member.findOne({ userId }),
    ]);

    if (!event) {
      throw new ApiError(404, "Event not found");
    }

    if (!member || member.status !== "Active") {
      throw new ApiError(400, "Only active members can apply as volunteers");
    }

    const existing = await Volunteer.findOne({ eventId, memberId: member._id });
    if (existing) {
      throw new ApiError(409, "You have already applied for this event");
    }

    const application = await Volunteer.create({
      eventId,
      memberId: member._id,
      role: payload.role || "Volunteer",
      message: payload.message || "",
      status: "Pending",
    });

    await AuditService.log({
      actorId: userId,
      action: "EVENT_VOLUNTEER_APPLIED",
      resource: "Volunteer",
      resourceId: application._id.toString(),
      requestId,
      metadata: { eventId, memberId: member._id.toString() },
    });

    return application;
  }

  static async listVolunteers(eventId) {
    const event = await Event.findById(eventId);
    if (!event) {
      throw new ApiError(404, "Event not found");
    }

    return Volunteer.find({ eventId })
      .populate("memberId", "studentId batch currentYear status")
      .populate("reviewedBy", "firstName lastName email")
      .sort({ createdAt: -1 });
  }

  static async reviewVolunteerApplication(applicationId, payload, actorId, requestId) {
    const application = await Volunteer.findById(applicationId).populate("eventId", "title eventDate venue");
    if (!application) {
      throw new ApiError(404, "Volunteer application not found");
    }

    if (application.status !== "Pending") {
      throw new ApiError(409, "This application has already been reviewed");
    }

    application.status = payload.decision;
    application.reviewNote = payload.reason;
    application.reviewedBy = actorId;
    application.reviewedAt = new Date();
    await application.save();

    await AuditService.log({
      actorId,
      action: "EVENT_VOLUNTEER_REVIEWED",
      resource: "Volunteer",
      resourceId: application._id.toString(),
      requestId,
      metadata: {
        eventId: application.eventId?._id?.toString() || application.eventId?.toString(),
        decision: payload.decision,
      },
    });

    return application.populate([
      { path: "memberId", select: "studentId batch currentYear status" },
      { path: "reviewedBy", select: "firstName lastName email" },
    ]);
  }

  static async registerVolunteer(payload) {
    const member = await Member.findById(payload.memberId);
    if (!member || member.status !== "Active") {
      throw new ApiError(400, "Only active members can register as volunteers");
    }
    return Volunteer.create(payload);
  }
}

module.exports = { EventService };
