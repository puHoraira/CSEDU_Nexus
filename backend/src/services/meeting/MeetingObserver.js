const { NotificationService } = require("../NotificationService");

/**
 * Observer Pattern for Meeting Events
 * Notifies participants about meeting events
 */

class MeetingObserver {
  async notify(event, data) {
    throw new Error("notify() must be implemented by subclass");
  }
}

/**
 * Meeting Created Observer
 */
class MeetingCreatedObserver extends MeetingObserver {
  async notify(event, data) {
    const { meeting, excludeUserIds = [] } = data;
    
    // Use targeted notification for meetings with target audience
    await NotificationService.notifyMeetingParticipants(meeting._id, {
      title: `New ${meeting.meetingMode} meeting scheduled`,
      message: `${meeting.title} is scheduled for ${new Date(meeting.startTime).toLocaleString()}`,
      category: "Meeting",
      actionUrl: `/dashboard/meetings/${meeting._id}`,
      entityType: "Meeting",
      entityId: meeting._id.toString(),
      metadata: {
        meetingId: meeting._id.toString(),
        meetingType: meeting.meetingType,
        meetingMode: meeting.meetingMode
      }
    }, { excludeUserIds });
  }
}

/**
 * Meeting Started Observer
 */
class MeetingStartedObserver extends MeetingObserver {
  async notify(event, data) {
    const { meeting } = data;
    
    const participantIds = meeting.participants.map(p => p.userId.toString());

    const notificationPromises = participantIds.map(userId =>
      NotificationService.createForUser(userId, {
        title: "Meeting has started",
        message: `${meeting.title} is now in progress`,
        category: "Meeting",
        actionUrl: meeting.meetingMode === "Online" 
          ? `/dashboard/meetings/${meeting._id}/room`
          : `/dashboard/meetings/${meeting._id}`,
        entityType: "Meeting",
        entityId: meeting._id.toString(),
        metadata: {
          meetingId: meeting._id.toString(),
          status: "In_Progress"
        }
      })
    );

    await Promise.allSettled(notificationPromises);
  }
}

/**
 * Meeting Completed Observer
 */
class MeetingCompletedObserver extends MeetingObserver {
  async notify(event, data) {
    const { meeting } = data;
    
    const participantIds = meeting.participants.map(p => p.userId.toString());

    const notificationPromises = participantIds.map(userId =>
      NotificationService.createForUser(userId, {
        title: "Meeting completed",
        message: `${meeting.title} has been completed. Minutes are now available.`,
        category: "Meeting",
        actionUrl: `/dashboard/meetings/${meeting._id}`,
        entityType: "Meeting",
        entityId: meeting._id.toString(),
        metadata: {
          meetingId: meeting._id.toString(),
          status: "Completed"
        }
      })
    );

    await Promise.allSettled(notificationPromises);
  }
}

/**
 * Meeting Cancelled Observer
 */
class MeetingCancelledObserver extends MeetingObserver {
  async notify(event, data) {
    const { meeting } = data;
    
    const participantIds = meeting.participants.map(p => p.userId.toString());

    const notificationPromises = participantIds.map(userId =>
      NotificationService.createForUser(userId, {
        title: "Meeting cancelled",
        message: `${meeting.title} has been cancelled. ${meeting.cancellationReason || ""}`,
        category: "Meeting",
        actionUrl: `/dashboard/meetings`,
        entityType: "Meeting",
        entityId: meeting._id.toString(),
        metadata: {
          meetingId: meeting._id.toString(),
          status: "Cancelled",
          reason: meeting.cancellationReason
        }
      })
    );

    await Promise.allSettled(notificationPromises);
  }
}

/**
 * Meeting Postponed Observer
 */
class MeetingPostponedObserver extends MeetingObserver {
  async notify(event, data) {
    const { meeting } = data;
    
    const participantIds = meeting.participants.map(p => p.userId.toString());

    const notificationPromises = participantIds.map(userId =>
      NotificationService.createForUser(userId, {
        title: "Meeting postponed",
        message: `${meeting.title} has been postponed to ${new Date(meeting.postponedTo).toLocaleString()}. ${meeting.postponementReason || ""}`,
        category: "Meeting",
        actionUrl: `/dashboard/meetings/${meeting._id}`,
        entityType: "Meeting",
        entityId: meeting._id.toString(),
        metadata: {
          meetingId: meeting._id.toString(),
          status: "Postponed",
          postponedTo: meeting.postponedTo,
          reason: meeting.postponementReason
        }
      })
    );

    await Promise.allSettled(notificationPromises);
  }
}

/**
 * Meeting Reminder Observer
 */
class MeetingReminderObserver extends MeetingObserver {
  async notify(event, data) {
    const { meeting, minutesBefore } = data;
    
    const participantIds = meeting.participants.map(p => p.userId.toString());

    const notificationPromises = participantIds.map(userId =>
      NotificationService.createForUser(userId, {
        title: `Meeting reminder: ${minutesBefore} minutes`,
        message: `${meeting.title} starts in ${minutesBefore} minutes at ${meeting.venue}`,
        category: "Meeting",
        actionUrl: meeting.meetingMode === "Online"
          ? `/dashboard/meetings/${meeting._id}/room`
          : `/dashboard/meetings/${meeting._id}`,
        entityType: "Meeting",
        entityId: meeting._id.toString(),
        metadata: {
          meetingId: meeting._id.toString(),
          minutesBefore,
          meetingMode: meeting.meetingMode
        }
      })
    );

    await Promise.allSettled(notificationPromises);
  }
}

/**
 * Attendance Marked Observer
 */
class AttendanceMarkedObserver extends MeetingObserver {
  async notify(event, data) {
    const { attendance, meeting } = data;
    
    // Notify user about their attendance
    await NotificationService.createForUser(attendance.userId, {
      title: "Attendance marked",
      message: `Your attendance for ${meeting.title} has been marked as ${attendance.attendanceStatus}`,
      category: "Meeting",
      actionUrl: `/dashboard/meetings/${meeting._id}`,
      entityType: "MeetingAttendance",
      entityId: attendance._id.toString(),
      metadata: {
        meetingId: meeting._id.toString(),
        attendanceStatus: attendance.attendanceStatus,
        isLate: attendance.isLate
      }
    });
  }
}

/**
 * Meeting Event Manager
 * Manages observers and notifies them of events
 */
class MeetingEventManager {
  constructor() {
    this.observers = {
      created: [new MeetingCreatedObserver()],
      started: [new MeetingStartedObserver()],
      completed: [new MeetingCompletedObserver()],
      cancelled: [new MeetingCancelledObserver()],
      postponed: [new MeetingPostponedObserver()],
      reminder: [new MeetingReminderObserver()],
      attendanceMarked: [new AttendanceMarkedObserver()]
    };
  }

  addObserver(event, observer) {
    if (!this.observers[event]) {
      this.observers[event] = [];
    }
    this.observers[event].push(observer);
  }

  async notifyObservers(event, data) {
    const observers = this.observers[event] || [];
    const promises = observers.map(observer => observer.notify(event, data));
    await Promise.allSettled(promises);
  }
}

// Singleton instance
const meetingEventManager = new MeetingEventManager();

module.exports = {
  MeetingObserver,
  MeetingCreatedObserver,
  MeetingStartedObserver,
  MeetingCompletedObserver,
  MeetingCancelledObserver,
  MeetingPostponedObserver,
  MeetingReminderObserver,
  AttendanceMarkedObserver,
  MeetingEventManager,
  meetingEventManager
};
