const { ApiError } = require("../../core/ApiError");

/**
 * State Pattern for Meeting Lifecycle Management
 * Manages meeting state transitions and validates state-specific operations
 */

class MeetingState {
  constructor(meeting) {
    this.meeting = meeting;
  }

  canTransitionTo(newStatus) {
    throw new Error("canTransitionTo() must be implemented by subclass");
  }

  start() {
    throw new ApiError(400, `Cannot start meeting in ${this.meeting.status} state`);
  }

  complete() {
    throw new ApiError(400, `Cannot complete meeting in ${this.meeting.status} state`);
  }

  cancel() {
    throw new ApiError(400, `Cannot cancel meeting in ${this.meeting.status} state`);
  }

  postpone() {
    throw new ApiError(400, `Cannot postpone meeting in ${this.meeting.status} state`);
  }
}

class DraftState extends MeetingState {
  canTransitionTo(newStatus) {
    return ["Scheduled", "Cancelled"].includes(newStatus);
  }

  async start() {
    this.meeting.status = "Scheduled";
    this.meeting.startedAt = new Date();
    await this.meeting.save();
    return this.meeting;
  }

  async cancel() {
    this.meeting.status = "Cancelled";
    this.meeting.cancelledAt = new Date();
    await this.meeting.save();
    return this.meeting;
  }
}

class ScheduledState extends MeetingState {
  canTransitionTo(newStatus) {
    return ["In_Progress", "Completed", "Cancelled", "Postponed"].includes(newStatus);
  }

  async start() {
    this.meeting.status = "In_Progress";
    this.meeting.startedAt = new Date();
    await this.meeting.save();
    return this.meeting;
  }

  async complete() {
    // Allow direct completion if meeting time has passed
    if (this.meeting.isPast) {
      this.meeting.status = "Completed";
      this.meeting.completedAt = new Date();
      await this.meeting.save();
      return this.meeting;
    }
    throw new ApiError(400, "Cannot complete a scheduled meeting that hasn't started");
  }

  async cancel() {
    this.meeting.status = "Cancelled";
    this.meeting.cancelledAt = new Date();
    await this.meeting.save();
    return this.meeting;
  }

  async postpone(newDate, reason) {
    this.meeting.status = "Postponed";
    this.meeting.postponedTo = newDate;
    this.meeting.postponementReason = reason;
    await this.meeting.save();
    return this.meeting;
  }
}

class InProgressState extends MeetingState {
  canTransitionTo(newStatus) {
    return ["Completed", "Cancelled"].includes(newStatus);
  }

  async complete() {
    this.meeting.status = "Completed";
    this.meeting.completedAt = new Date();
    await this.meeting.save();
    return this.meeting;
  }

  async cancel() {
    this.meeting.status = "Cancelled";
    this.meeting.cancelledAt = new Date();
    await this.meeting.save();
    return this.meeting;
  }
}

class CompletedState extends MeetingState {
  canTransitionTo(newStatus) {
    return []; // Terminal state
  }
}

class CancelledState extends MeetingState {
  canTransitionTo(newStatus) {
    return []; // Terminal state
  }
}

class PostponedState extends MeetingState {
  canTransitionTo(newStatus) {
    return ["Scheduled", "Cancelled"].includes(newStatus);
  }

  async start() {
    this.meeting.status = "Scheduled";
    await this.meeting.save();
    return this.meeting;
  }

  async cancel() {
    this.meeting.status = "Cancelled";
    this.meeting.cancelledAt = new Date();
    await this.meeting.save();
    return this.meeting;
  }
}

/**
 * Meeting State Manager
 * Factory for creating appropriate state objects
 */
class MeetingStateManager {
  static getState(meeting) {
    switch (meeting.status) {
      case "Draft":
        return new DraftState(meeting);
      case "Scheduled":
        return new ScheduledState(meeting);
      case "In_Progress":
        return new InProgressState(meeting);
      case "Completed":
        return new CompletedState(meeting);
      case "Cancelled":
        return new CancelledState(meeting);
      case "Postponed":
        return new PostponedState(meeting);
      default:
        throw new ApiError(400, `Unknown meeting status: ${meeting.status}`);
    }
  }

  static async startMeeting(meeting) {
    const state = this.getState(meeting);
    return await state.start();
  }

  static async completeMeeting(meeting) {
    const state = this.getState(meeting);
    return await state.complete();
  }

  static async cancelMeeting(meeting, reason) {
    const state = this.getState(meeting);
    meeting.cancellationReason = reason;
    return await state.cancel();
  }

  static async postponeMeeting(meeting, newDate, reason) {
    const state = this.getState(meeting);
    return await state.postpone(newDate, reason);
  }

  static canTransitionTo(meeting, newStatus) {
    const state = this.getState(meeting);
    return state.canTransitionTo(newStatus);
  }
}

module.exports = { MeetingStateManager };
