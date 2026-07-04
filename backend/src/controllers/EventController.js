const { ApiResponse } = require("../core/ApiResponse");
const { asyncHandler } = require("../core/asyncHandler");
const { EventService } = require("../services/EventService");
const { ApiError } = require("../core/ApiError");

class EventController {
  static create = asyncHandler(async (req, res) => {
    const eventDate = new Date(req.body.eventDate);
    if (Number.isNaN(eventDate.getTime())) {
      throw new ApiError(400, "Invalid event date");
    }

    const payload = { ...req.body, eventDate };
    const event = await EventService.createEvent(payload, req.auth.userId);
    return ApiResponse.created(res, event, "Event created");
  });

  static update = asyncHandler(async (req, res) => {
    const payload = { ...req.body };

    if (payload.eventDate) {
      const eventDate = new Date(payload.eventDate);
      if (Number.isNaN(eventDate.getTime())) {
        throw new ApiError(400, "Invalid event date");
      }
      payload.eventDate = eventDate;
    }

    const event = await EventService.updateEvent(req.params.id, payload, req.auth.userId, req.requestMeta.requestId);
    return ApiResponse.ok(res, event, "Event updated");
  });

  static detail = asyncHandler(async (req, res) => {
    const event = await EventService.getEventById(req.params.id);
    return ApiResponse.ok(res, event, "Event");
  });

  static list = asyncHandler(async (req, res) => {
    const userId = req.auth?.userId || req.user?._id || null;
    const events = await EventService.listEvents(userId);
    return ApiResponse.ok(res, events, "Events");
  });

  static feed = asyncHandler(async (req, res) => {
    const feed = await EventService.listEventFeed(req.params.id);
    return ApiResponse.ok(res, feed, "Event feed");
  });

  static createPost = asyncHandler(async (req, res) => {
    const post = await EventService.createEventPost(req.params.id, req.body, req.auth.userId, req.requestMeta.requestId);
    return ApiResponse.created(res, post, "Event post created");
  });

  static commentOnPost = asyncHandler(async (req, res) => {
    const comment = await EventService.addEventComment(
      req.params.id,
      req.params.postId,
      req.body,
      req.auth.userId,
      req.requestMeta.requestId
    );
    return ApiResponse.created(res, comment, "Event comment added");
  });

  static applyVolunteer = asyncHandler(async (req, res) => {
    const volunteer = await EventService.applyAsVolunteer(req.params.id, req.body, req.auth.userId, req.requestMeta.requestId);
    return ApiResponse.created(res, volunteer, "Volunteer application submitted");
  });

  static listVolunteers = asyncHandler(async (req, res) => {
    const volunteers = await EventService.listVolunteers(req.params.id);
    return ApiResponse.ok(res, volunteers, "Event volunteers");
  });

  static reviewVolunteer = asyncHandler(async (req, res) => {
    const volunteer = await EventService.reviewVolunteerApplication(req.params.id, req.body, req.auth.userId, req.requestMeta.requestId);
    return ApiResponse.ok(res, volunteer, "Volunteer application reviewed");
  });

  static volunteer = asyncHandler(async (req, res) => {
    const volunteer = await EventService.registerVolunteer(req.body);
    return ApiResponse.created(res, volunteer, "Volunteer registered");
  });

  static followEvent = asyncHandler(async (req, res) => {
    const result = await EventService.followEvent(req.params.id, req.auth.userId, req.requestMeta.requestId);
    return ApiResponse.ok(res, result, "Event followed");
  });

  static unfollowEvent = asyncHandler(async (req, res) => {
    const result = await EventService.unfollowEvent(req.params.id, req.auth.userId, req.requestMeta.requestId);
    return ApiResponse.ok(res, result, "Event unfollowed");
  });

  static checkVolunteerEligibility = asyncHandler(async (req, res) => {
    const eligibility = await EventService.checkVolunteerEligibility(req.params.id, req.auth.userId);
    return ApiResponse.ok(res, eligibility, "Volunteer eligibility");
  });
}

module.exports = { EventController };
