const { Event } = require("../models/Event");
const { EventPost } = require("../models/EventPost");
const { EventComment } = require("../models/EventComment");
const { Volunteer } = require("../models/Volunteer");
const { Member } = require("../models/Member");
const { ApiError } = require("../core/ApiError");
const { AuditService } = require("./AuditService");
const { NotificationService } = require("./NotificationService");
const { annotateAudienceRelevance } = require("../utils/audienceUtils");

class EventService {
  static normalizeVolunteerEligibility(input = {}) {
    const years = Array.isArray(input?.allowedYears) ? input.allowedYears : [];
    const batches = Array.isArray(input?.allowedBatches) ? input.allowedBatches : [];

    const allowedYears = [...new Set(years.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value >= 1 && value <= 5))].sort(
      (a, b) => a - b
    );
    const allowedBatches = [...new Set(batches.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0))].sort(
      (a, b) => a - b
    );

    return { allowedYears, allowedBatches };
  }

  static normalizeVolunteerProgram(input = {}) {
    const positions = Array.isArray(input?.positions)
      ? input.positions
          .map((position) => ({
            name: String(position?.name || "").trim(),
            slots: Number(position?.slots || 0),
            description: String(position?.description || "").trim(),
            requiredYears: Array.isArray(position?.requiredYears)
              ? [...new Set(position.requiredYears.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value >= 1 && value <= 5))].sort(
                  (a, b) => a - b
                )
              : [],
            requiredBatches: Array.isArray(position?.requiredBatches)
              ? [...new Set(position.requiredBatches.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0))].sort(
                  (a, b) => a - b
                )
              : [],
          }))
          .filter((position) => position.name && position.slots >= 1)
      : [];

    const deadline = input?.applicationDeadline ? new Date(input.applicationDeadline) : null;

    return {
      applicationDeadline: deadline && !Number.isNaN(deadline.getTime()) ? deadline : null,
      notes: String(input?.notes || "").trim(),
      positions,
    };
  }

  static buildVolunteerEligibilityFailure(event, member) {
    const eligibility = this.normalizeVolunteerEligibility(event?.volunteerEligibility || {});

    if (eligibility.allowedYears.length > 0 && !eligibility.allowedYears.includes(member.currentYear)) {
      return `This event accepts volunteers from year ${eligibility.allowedYears.join(", ")} only.`;
    }

    if (eligibility.allowedBatches.length > 0 && !eligibility.allowedBatches.includes(member.batch)) {
      return `This event accepts volunteers from batch ${eligibility.allowedBatches.join(", ")} only.`;
    }

    return null;
  }

  static buildPositionEligibilityFailure(event, member, preferredPositions = []) {
    const positions = Array.isArray(event?.volunteerProgram?.positions) ? event.volunteerProgram.positions : [];
    if (preferredPositions.length === 0 || positions.length === 0) {
      return null;
    }

    const eligibleNames = positions
      .filter((position) => {
        const yearsOk = position.requiredYears.length === 0 || position.requiredYears.includes(member.currentYear);
        const batchesOk = position.requiredBatches.length === 0 || position.requiredBatches.includes(member.batch);
        return yearsOk && batchesOk;
      })
      .map((position) => position.name);

    const accepted = preferredPositions.some((position) => eligibleNames.includes(position));
    return accepted ? null : "None of the selected volunteer positions match your profile.";
  }

  static getPositionByName(event, positionName) {
    return (event?.volunteerProgram?.positions || []).find((position) => position.name === positionName) || null;
  }

  static async createEvent(payload, userId) {
    const event = await Event.create({
      ...payload,
      volunteerEligibility: this.normalizeVolunteerEligibility(payload.volunteerEligibility || {}),
      volunteerProgram: this.normalizeVolunteerProgram(payload.volunteerProgram || {}),
      createdBy: userId,
    });

    // Notify users based on target audience (if specified)
    if (event.targetAudience) {
      const hasTargeting = 
        (event.targetAudience.allowedYears && event.targetAudience.allowedYears.length > 0) ||
        (event.targetAudience.allowedBatches && event.targetAudience.allowedBatches.length > 0) ||
        (event.targetAudience.allowedRoles && event.targetAudience.allowedRoles.length > 0) ||
        (event.targetAudience.invitedUsers && event.targetAudience.invitedUsers.length > 0);

      if (hasTargeting) {
        await NotificationService.notifyEventFollowers(event._id, {
          title: 'New Event Created',
          message: `${event.title} has been created`,
          category: 'Event',
          actionUrl: `/dashboard/events/${event._id}`,
          entityType: 'Event',
          entityId: event._id.toString(),
        }, { 
          excludeUserIds: [userId], // Don't notify the creator
          notifyTargetAudience: true, // Notify users matching target audience
          includeRegistered: false, // Don't include registered (event just created)
        });
      }
    }

    return event;
  }

  static async updateEvent(eventId, payload, actorId, requestId) {
    const event = await Event.findById(eventId);
    if (!event) {
      throw new ApiError(404, "Event not found");
    }

    const changesRequireNotification = 
      (payload.eventDate !== undefined && payload.eventDate !== event.eventDate) ||
      (payload.venue !== undefined && payload.venue !== event.venue) ||
      (payload.status !== undefined && payload.status !== event.status);

    if (payload.title !== undefined) event.title = payload.title;
    if (payload.description !== undefined) event.description = payload.description;
    if (payload.eventDate !== undefined) event.eventDate = payload.eventDate;
    if (payload.venue !== undefined) event.venue = payload.venue;
    if (payload.budget !== undefined) event.budget = payload.budget;
    if (payload.status !== undefined) event.status = payload.status;
    if (payload.visibility !== undefined) event.visibility = payload.visibility;
    if (payload.targetAudience !== undefined) event.targetAudience = payload.targetAudience;
    if (payload.volunteerEligibility !== undefined) {
      event.volunteerEligibility = this.normalizeVolunteerEligibility(payload.volunteerEligibility);
    }
    if (payload.volunteerProgram !== undefined) {
      event.volunteerProgram = this.normalizeVolunteerProgram(payload.volunteerProgram);
    }

    await event.save();

    await AuditService.log({
      actorId,
      action: "EVENT_UPDATED",
      resource: "Event",
      resourceId: event._id.toString(),
      requestId,
      metadata: {
        status: event.status,
        eligibility: event.volunteerEligibility,
      },
    });

    // Notify followers and participants of important changes
    if (changesRequireNotification) {
      await NotificationService.notifyEventFollowers(event._id, {
        title: 'Event Updated',
        message: `${event.title} has been updated. Please check the details.`,
        category: 'Event',
        actionUrl: `/dashboard/events/${event._id}`,
        entityType: 'Event',
        entityId: event._id.toString(),
      }, { excludeUserIds: [actorId] });
    }

    return event;
  }

  static async getEventById(eventId) {
    const event = await Event.findById(eventId).populate("createdBy", "firstName lastName email");
    if (!event) {
      throw new ApiError(404, "Event not found");
    }
    return event;
  }

  static async listEvents(requestingUserId = null) {
    const events = await Event.find({}).sort({ eventDate: 1 });

    if (!requestingUserId) {
      // No user context - only show events without any targeting
      return events.filter(ev => {
        const ta = ev.targetAudience || {};
        const hasAnyFilter = 
          (Array.isArray(ta.allowedYears) && ta.allowedYears.length > 0) ||
          (Array.isArray(ta.allowedBatches) && ta.allowedBatches.length > 0) ||
          (Array.isArray(ta.allowedRoles) && ta.allowedRoles.length > 0) ||
          (Array.isArray(ta.invitedUsers) && ta.invitedUsers.length > 0) ||
          (Array.isArray(ev.targetYears) && ev.targetYears.length > 0 && !ev.targetYears.includes("All_Years"));
        
        return !hasAnyFilter; // Show only public/open events
      });
    }

    // Get user's member info and roles
    const { UserRole } = require('../models/UserRole');
    const { Role } = require('../models/Role');
    
    const [member, userRoleRecords] = await Promise.all([
      Member.findOne({ userId: requestingUserId }).select('batch currentYear academicYearLevel'),
      UserRole.find({ userId: requestingUserId }).populate('roleId')
    ]);

    const userRoles = userRoleRecords.map(ur => ur.roleId?.roleName).filter(Boolean);

    // Filter events by targetAudience (comprehensive filtering)
    const { filterByAudience } = require('../utils/audienceUtils');
    
    // Convert to plain objects first and identify user's events
    const eventsObjects = events.map(e => e.toObject());
    
    // Get events created by user BEFORE filtering
    const createdByUserIds = eventsObjects
      .filter(ev => ev.createdBy && ev.createdBy.toString() === requestingUserId.toString())
      .map(ev => ev._id.toString());
    
    let filteredEvents = filterByAudience(
      eventsObjects, 
      member, 
      requestingUserId, 
      userRoles
    );

    // Also apply legacy targetYears filtering
    if (member) {
      filteredEvents = filteredEvents.filter(ev => {
        const targetYears = ev.targetYears || [];
        
        // No target years or includes All_Years - show to everyone
        if (targetYears.length === 0 || targetYears.includes("All_Years")) {
          return true;
        }
        
        // Check if user's year level is in target years
        return targetYears.includes(member.academicYearLevel);
      });
    }

    // Add back events created by user that weren't in filtered list
    eventsObjects.forEach(event => {
      const isCreatedByUser = createdByUserIds.includes(event._id.toString());
      const alreadyIncluded = filteredEvents.find(e => e._id.toString() === event._id.toString());
      
      if (isCreatedByUser && !alreadyIncluded) {
        filteredEvents.push(event);
      }
    });

    return filteredEvents;
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
    const event = await Event.findById(eventId).select("_id title followers");
    if (!event) {
      throw new ApiError(404, "Event not found");
    }

    const post = await EventPost.create({
      eventId,
      authorId,
      content: payload.content,
      images: payload.images || [],
      isAnnouncement: payload.isAnnouncement || false,
    });

    // Update event stats
    await Event.findByIdAndUpdate(eventId, { $inc: { "stats.totalPosts": 1 } });

    await AuditService.log({
      actorId: authorId,
      action: "EVENT_UPDATE_POST_CREATED",
      resource: "EventPost",
      resourceId: post._id.toString(),
      requestId,
      metadata: { eventId, isAnnouncement: post.isAnnouncement },
    });

    // Notify event followers (excluding the author)
    if (event.followers && event.followers.length > 0) {
      const notifTitle = post.isAnnouncement 
        ? `📢 Important announcement in ${event.title}`
        : `New post in ${event.title}`;
      
      const notifMessage = payload.content.substring(0, 150) + (payload.content.length > 150 ? '...' : '');
      
      await NotificationService.notifyEventFollowers(
        eventId,
        {
          title: notifTitle,
          message: notifMessage,
          category: "Event",
          actionUrl: `/dashboard/events/${eventId}`,
          entityType: "EventPost",
          entityId: post._id.toString(),
          metadata: { eventId: eventId.toString(), isAnnouncement: post.isAnnouncement },
        },
        {
          excludeUserIds: [authorId], // Don't notify the post author
          includeRegistered: false, // Only notify followers
        }
      );
    }

    return post.populate("authorId", "firstName lastName email avatarUrl");
  }

  static async addEventComment(eventId, postId, payload, authorId, requestId) {
    const [event, post] = await Promise.all([
      Event.findById(eventId).select("_id title followers"),
      EventPost.findOne({ _id: postId, eventId }).select("_id authorId"),
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

    // Update stats
    await Promise.all([
      Event.findByIdAndUpdate(eventId, { $inc: { "stats.totalComments": 1 } }),
      EventPost.findByIdAndUpdate(postId, { $inc: { "stats.totalComments": 1 } })
    ]);

    await AuditService.log({
      actorId: authorId,
      action: "EVENT_UPDATE_COMMENT_CREATED",
      resource: "EventComment",
      resourceId: comment._id.toString(),
      requestId,
      metadata: { eventId, postId },
    });

    // Notify post author (if they didn't comment themselves)
    const postAuthorId = post.authorId?.toString();
    if (postAuthorId && postAuthorId !== authorId.toString()) {
      await NotificationService.createForUser(postAuthorId, {
        title: `💬 New comment on your post`,
        message: payload.content.substring(0, 150) + (payload.content.length > 150 ? '...' : ''),
        category: "Event",
        actionUrl: `/dashboard/events/${eventId}`,
        entityType: "EventComment",
        entityId: comment._id.toString(),
        metadata: { eventId: eventId.toString(), postId: postId.toString() },
      });
    }

    // Notify event followers (excluding the commenter and post author who already got notified)
    if (event.followers && event.followers.length > 0) {
      const excludeIds = [authorId];
      if (postAuthorId) excludeIds.push(postAuthorId);

      await NotificationService.notifyEventFollowers(
        eventId,
        {
          title: `💬 New comment in ${event.title}`,
          message: payload.content.substring(0, 150) + (payload.content.length > 150 ? '...' : ''),
          category: "Event",
          actionUrl: `/dashboard/events/${eventId}`,
          entityType: "EventComment",
          entityId: comment._id.toString(),
          metadata: { eventId: eventId.toString(), postId: postId.toString() },
        },
        {
          excludeUserIds: excludeIds,
          includeRegistered: false, // Only notify followers for comments
        }
      );
    }

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

    if (["Completed", "Cancelled"].includes(event.status)) {
      throw new ApiError(409, "Volunteer applications are closed for this event");
    }

    if (event.volunteerProgram?.applicationDeadline) {
      const now = new Date();
      if (now > new Date(event.volunteerProgram.applicationDeadline)) {
        throw new ApiError(409, "Volunteer application deadline has passed");
      }
    }

    if (!member || member.membershipStatus?.status !== "Active") {
      throw new ApiError(400, "Only active members can apply as volunteers");
    }

    const eligibilityFailure = this.buildVolunteerEligibilityFailure(event, member);
    if (eligibilityFailure) {
      throw new ApiError(403, eligibilityFailure);
    }

    const positionFailure = this.buildPositionEligibilityFailure(event, member, payload.preferredPositions || []);
    if (positionFailure) {
      throw new ApiError(403, positionFailure);
    }

    const existing = await Volunteer.findOne({ eventId, memberId: member._id });
    if (existing) {
      throw new ApiError(409, "You have already applied for this event");
    }

    const application = await Volunteer.create({
      eventId,
      memberId: member._id,
      role: payload.role || "Volunteer",
      preferredPositions: payload.preferredPositions || [],
      availability: payload.availability || "",
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

    const event = await Event.findById(application.eventId._id).select("volunteerProgram");

    if (payload.decision === "Approved") {
      const assignedPosition = payload.assignedPosition || application.preferredPositions?.[0] || "Volunteer";
      const position = this.getPositionByName(event, assignedPosition);
      if (position) {
        const approvedCount = await Volunteer.countDocuments({
          eventId: application.eventId._id,
          status: "Approved",
          assignedPosition,
        });
        if (approvedCount >= position.slots) {
          throw new ApiError(409, `No remaining slots for ${assignedPosition}`);
        }
      }
      application.assignedPosition = assignedPosition;
      application.status = "Approved";
    } else if (payload.decision === "Shortlisted") {
      application.status = "Shortlisted";
      application.assignedPosition = payload.assignedPosition || application.preferredPositions?.[0] || "";
    } else if (payload.decision === "Waitlisted") {
      application.status = "Waitlisted";
      application.assignedPosition = "";
    } else {
      application.status = "Rejected";
      application.assignedPosition = "";
    }

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
        assignedPosition: application.assignedPosition,
      },
    });

    const applicantMember = await Member.findById(application.memberId).select("userId");
    if (applicantMember?.userId) {
      await NotificationService.createForUser(applicantMember.userId, {
        title: "Volunteer application updated",
        message: `Your application for ${application.eventId?.title || "the event"} is now ${application.status}.`,
        category: "Event",
        actionUrl: `/events/${application.eventId?._id?.toString() || ""}`,
        entityType: "Volunteer",
        entityId: application._id.toString(),
        metadata: { decision: payload.decision, assignedPosition: application.assignedPosition || "" },
      });
    }

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

  static async followEvent(eventId, userId, requestId) {
    const event = await Event.findById(eventId);
    if (!event) {
      throw new ApiError(404, "Event not found");
    }

    // Check if already following
    if (event.followers.includes(userId)) {
      throw new ApiError(409, "You are already following this event");
    }

    event.followers.push(userId);
    event.stats.totalFollowers = event.followers.length;
    await event.save();

    await AuditService.log({
      actorId: userId,
      action: "EVENT_FOLLOWED",
      resource: "Event",
      resourceId: event._id.toString(),
      requestId,
      metadata: { eventId: event._id.toString() },
    });

    return { message: "Event followed successfully", totalFollowers: event.stats.totalFollowers };
  }

  static async unfollowEvent(eventId, userId, requestId) {
    const event = await Event.findById(eventId);
    if (!event) {
      throw new ApiError(404, "Event not found");
    }

    // Check if following
    const index = event.followers.indexOf(userId);
    if (index === -1) {
      throw new ApiError(409, "You are not following this event");
    }

    event.followers.splice(index, 1);
    event.stats.totalFollowers = event.followers.length;
    await event.save();

    await AuditService.log({
      actorId: userId,
      action: "EVENT_UNFOLLOWED",
      resource: "Event",
      resourceId: event._id.toString(),
      requestId,
      metadata: { eventId: event._id.toString() },
    });

    return { message: "Event unfollowed successfully", totalFollowers: event.stats.totalFollowers };
  }

  static async checkVolunteerEligibility(eventId, userId) {
    const [event, member] = await Promise.all([
      Event.findById(eventId),
      Member.findOne({ userId }),
    ]);

    if (!event) {
      throw new ApiError(404, "Event not found");
    }

    if (!member) {
      return {
        isEligible: false,
        reasons: ["You must be a registered member to volunteer"],
        memberInfo: null,
      };
    }

    if (member.membershipStatus.status !== "Active") {
      return {
        isEligible: false,
        reasons: ["Only active members can volunteer"],
        memberInfo: {
          studentId: member.studentId,
          batch: member.batch,
          currentYear: member.currentYear,
          status: member.membershipStatus.status,
        },
      };
    }

    // Check if already applied
    const existing = await Volunteer.findOne({ eventId, memberId: member._id });
    if (existing) {
      return {
        isEligible: false,
        reasons: [`You have already applied (Status: ${existing.status})`],
        memberInfo: {
          studentId: member.studentId,
          batch: member.batch,
          currentYear: member.currentYear,
          status: member.membershipStatus.status,
        },
        existingApplication: {
          status: existing.status,
          appliedAt: existing.createdAt,
          assignedPosition: existing.assignedPosition,
        },
      };
    }

    // Check event status
    if (["Completed", "Cancelled"].includes(event.status)) {
      return {
        isEligible: false,
        reasons: ["Volunteer applications are closed for this event"],
        memberInfo: {
          studentId: member.studentId,
          batch: member.batch,
          currentYear: member.currentYear,
          status: member.membershipStatus.status,
        },
      };
    }

    // Check deadline
    if (event.volunteerProgram?.applicationDeadline) {
      const now = new Date();
      if (now > new Date(event.volunteerProgram.applicationDeadline)) {
        return {
          isEligible: false,
          reasons: ["Volunteer application deadline has passed"],
          memberInfo: {
            studentId: member.studentId,
            batch: member.batch,
            currentYear: member.currentYear,
            status: member.membershipStatus.status,
          },
        };
      }
    }

    // Check eligibility criteria
    const eligibilityFailure = this.buildVolunteerEligibilityFailure(event, member);
    if (eligibilityFailure) {
      return {
        isEligible: false,
        reasons: [eligibilityFailure],
        memberInfo: {
          studentId: member.studentId,
          batch: member.batch,
          currentYear: member.currentYear,
          status: member.membershipStatus.status,
        },
      };
    }

    // All checks passed
    return {
      isEligible: true,
      reasons: [],
      memberInfo: {
        studentId: member.studentId,
        batch: member.batch,
        currentYear: member.currentYear,
        status: member.membershipStatus.status,
      },
      availablePositions: event.volunteerProgram?.positions || [],
    };
  }
}

module.exports = { EventService };
