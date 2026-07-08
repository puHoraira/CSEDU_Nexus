# Professional Targeted Notification System

## Overview
The notification system has been redesigned to send targeted, relevant notifications only to users who should receive them. This eliminates notification spam and ensures users only see what's relevant to them.

## Core Principles

### ❌ OLD SYSTEM (Bad - Broadcasting)
- Everyone gets all notifications
- EC meeting notifications sent to all members
- Event updates sent to everyone regardless of interest
- Role-specific content notified to all users

### ✅ NEW SYSTEM (Professional - Targeted)
- **Event notifications** → Only followers + registered participants + target audience
- **Workshop notifications** → Only followers + registered participants + target audience
- **EC Meeting notifications** → Only EC members + invited users
- **Role-specific notifications** → Only users with those roles
- **Post/Comment notifications** → Only event/workshop followers
- **Personal notifications** → Only the intended recipient

## Notification Methods

### 1. `createForUser(userId, payload)`
**Use:** Send notification to a single user
```javascript
await NotificationService.createForUser(userId, {
  title: 'Registration Confirmed',
  message: 'You registered for Workshop X',
  category: 'Workshop',
  actionUrl: '/workshops/123',
  entityType: 'WorkshopRegistration',
  entityId: 'reg123'
});
```

### 2. `createForUsers(userIds, payload)`
**Use:** Send notification to multiple specific users
```javascript
await NotificationService.createForUsers([user1, user2, user3], {
  title: 'New Announcement',
  message: 'Important update',
  category: 'Announcement'
});
```

### 3. `createForRoleNames(roleNames, payload)`
**Use:** Send notification to users with specific roles
```javascript
// EC-only notification
await NotificationService.createForRoleNames(['President', 'Vice President', 'EC Member'], {
  title: 'EC Meeting Tomorrow',
  message: 'Executive Committee meeting at 5 PM',
  category: 'Meeting',
  actionUrl: '/meetings/456'
});
```

### 4. `notifyEventFollowers(eventId, payload, options)`
**Use:** Notify event followers, participants, and target audience
```javascript
await NotificationService.notifyEventFollowers(eventId, {
  title: 'Event Updated',
  message: 'Event time has changed',
  category: 'Event',
  actionUrl: '/events/123'
}, {
  excludeUserIds: [creatorId],    // Don't notify the person who made the change
  includeRegistered: true,        // Include registered participants (default: true)
  notifyTargetAudience: false     // Notify target audience (default: false, only for creation)
});
```

**Who Gets Notified:**
- Users who explicitly followed the event
- Users registered for the event (if includeRegistered is true)
- Users matching the event's target audience (if notifyTargetAudience is true)

### 5. `notifyWorkshopFollowers(workshopId, payload, options)`
**Use:** Notify workshop followers, participants, and target audience
```javascript
await NotificationService.notifyWorkshopFollowers(workshopId, {
  title: 'Workshop Material Added',
  message: 'New slides available',
  category: 'Workshop',
  actionUrl: '/workshops/789'
}, {
  excludeUserIds: [uploaderId],
  includeRegistered: true,       // Include registered participants (default: true)
  notifyTargetAudience: false    // Notify target audience (default: false, only for creation)
});
```

**Who Gets Notified:**
- Users who followed the workshop
- Users registered for the workshop (if includeRegistered is true)
- Users matching the workshop's target audience (if notifyTargetAudience is true)

### 6. `notifyMeetingParticipants(meetingId, payload, options)`
**Use:** Notify meeting participants based on target audience
```javascript
await NotificationService.notifyMeetingParticipants(meetingId, {
  title: 'Meeting Postponed',
  message: 'EC meeting moved to Friday',
  category: 'Meeting',
  actionUrl: '/meetings/321'
});
```

**Who Gets Notified:**
- Explicit meeting participants
- Users matching the meeting's target audience (roles/year/batch/invited)

### 7. `getUsersByTargetAudience(targetAudience)`
**Use:** Get users matching target audience criteria (internal helper)
```javascript
const userIds = await NotificationService.getUsersByTargetAudience({
  allowedYears: [3, 4],          // Year 3 and 4 students
  allowedBatches: [29, 30],      // Batch 29 and 30
  allowedRoles: ['EC Member'],   // EC members
  invitedUsers: [user1, user2]   // Explicitly invited
});
```

## Target Audience Filtering

### Structure
```javascript
{
  allowedYears: [1, 2, 3, 4, 5],        // Academic years
  allowedBatches: [29, 30, 31],          // Batch numbers
  allowedRoles: ['President', 'Treasurer'], // Role names
  invitedUsers: ['userId1', 'userId2']   // Explicitly invited user IDs
}
```

### Rules
- **Empty arrays** = No filtering (public)
- **Multiple filters** = OR logic (match any criterion)
- **Invited users** = Always get notified (bypass other filters)

### Examples

#### Year-Specific Workshop
```javascript
targetAudience: {
  allowedYears: [1],  // Only 1st year students
  allowedBatches: [],
  allowedRoles: [],
  invitedUsers: []
}
```

#### EC-Only Meeting
```javascript
targetAudience: {
  allowedYears: [],
  allowedBatches: [],
  allowedRoles: ['President', 'Vice President', 'EC Member'],
  invitedUsers: []
}
```

#### Batch-Specific Event
```javascript
targetAudience: {
  allowedYears: [],
  allowedBatches: [29],  // Only Batch 29
  allowedRoles: [],
  invitedUsers: []
}
```

#### Private Invitation
```javascript
targetAudience: {
  allowedYears: [],
  allowedBatches: [],
  allowedRoles: [],
  invitedUsers: ['user1', 'user2', 'user3']  // Only these 3 users
}
```

## Implementation Examples

### Event Creation
```javascript
// EventService.js
static async createEvent(payload, userId) {
  const event = await Event.create({...payload, createdBy: userId});
  
  // Only notify if event has targeting (not public)
  if (event.targetAudience) {
    const hasTargeting = 
      event.targetAudience.allowedYears?.length > 0 ||
      event.targetAudience.allowedBatches?.length > 0 ||
      event.targetAudience.allowedRoles?.length > 0 ||
      event.targetAudience.invitedUsers?.length > 0;

    if (hasTargeting) {
      await NotificationService.notifyEventFollowers(event._id, {
        title: 'New Event Created',
        message: `${event.title} has been created`,
        category: 'Event',
        actionUrl: `/events/${event._id}`
      }, { excludeUserIds: [userId] });
    }
  }
  
  return event;
}
```

### Event Update
```javascript
static async updateEvent(eventId, payload, actorId) {
  const event = await Event.findById(eventId);
  
  const importantChange = 
    payload.eventDate !== event.eventDate ||
    payload.venue !== event.venue ||
    payload.status !== event.status;
  
  // Update event...
  await event.save();
  
  // Notify only if important changes
  if (importantChange) {
    await NotificationService.notifyEventFollowers(event._id, {
      title: 'Event Updated',
      message: `${event.title} has been updated`,
      category: 'Event',
      actionUrl: `/events/${event._id}`
    }, { excludeUserIds: [actorId] });
  }
}
```

### Registration Confirmation
```javascript
static async registerForEvent(eventId, userId) {
  // Create registration...
  const registration = await EventRegistration.create({...});
  
  // Personal confirmation notification
  await NotificationService.createForUser(userId, {
    title: 'Registration Confirmed',
    message: `You registered for ${event.title}`,
    category: 'Event',
    actionUrl: `/events/${eventId}`
  });
  
  return registration;
}
```

## Migration from Old System

### ❌ Don't Use (Deprecated)
```javascript
// Broadcasting to everyone - BAD!
await NotificationService.createForAllActiveUsers({
  title: 'New Event',
  message: 'Event X created'
});
```

### ✅ Use Instead
```javascript
// Targeted notification - GOOD!
await NotificationService.notifyEventFollowers(eventId, {
  title: 'New Event',
  message: 'Event X created'
});
```

## Best Practices

### 1. Always Exclude the Actor
Don't notify the person who performed the action:
```javascript
await NotificationService.notifyEventFollowers(eventId, payload, {
  excludeUserIds: [actorId]  // ✅ Don't notify the creator
});
```

### 2. Only Notify on Important Changes
Don't spam users with minor updates:
```javascript
// ✅ Good - only notify on important changes
if (dateChanged || venueChanged || statusChanged) {
  await NotificationService.notifyEventFollowers(...);
}

// ❌ Bad - notifying on every description edit
await NotificationService.notifyEventFollowers(...);
```

### 3. Use Appropriate Categories
```javascript
category: 'Event'          // For events
category: 'Workshop'       // For workshops
category: 'Meeting'        // For meetings
category: 'Announcement'   // For general announcements
category: 'Certificate'    // For certificates
category: 'Membership'     // For membership-related
category: 'System'         // For system notifications
```

### 4. Provide Action URLs
Always include actionUrl so users can navigate directly:
```javascript
actionUrl: `/events/${eventId}`
actionUrl: `/workshops/${workshopId}/materials`
actionUrl: `/meetings/${meetingId}/room`
```

### 5. Include Metadata
Add contextual metadata for frontend filtering:
```javascript
metadata: {
  eventId: event._id.toString(),
  registrationNumber: 'REG-123',
  priority: 'high'
}
```

## Testing Notification Targeting

### Test Case 1: EC Meeting (Role-Based)
```javascript
// Meeting with EC-only target audience
meeting.targetAudience = {
  allowedRoles: ['EC Member']
};

// Expected: Only users with 'EC Member' role get notified
// Expected: Regular members don't get notified
```

### Test Case 2: Year-Specific Workshop
```javascript
// Workshop for 1st years only
workshop.targetAudience = {
  allowedYears: [1]
};

// Expected: Only 1st year students get notified
// Expected: 2nd, 3rd, 4th year students don't get notified
```

### Test Case 3: Event Update
```javascript
// User A registers for event
// User B doesn't register or follow
// Event is updated

// Expected: User A gets notification (participant)
// Expected: User B doesn't get notification
```

### Test Case 4: Private Invitation
```javascript
// Event with specific invited users
event.targetAudience = {
  invitedUsers: ['user1', 'user2']
};

// Expected: Only user1 and user2 get notified
// Expected: Everyone else doesn't get notified
```

## Performance Considerations

1. **Batch Processing**: Notifications are created in bulk using `insertMany`
2. **Deduplication**: User IDs are normalized to remove duplicates
3. **Active Users Only**: Only active users receive notifications
4. **Lazy Loading**: Target audience is evaluated only when needed

## Future Enhancements

1. **Email Notifications**: Integrate with email service for important notifications
2. **Push Notifications**: Mobile app push notifications
3. **Notification Preferences**: Allow users to customize notification types
4. **Digest Mode**: Option to receive daily/weekly notification summaries
5. **Priority Levels**: Mark urgent notifications differently

## Summary

The new notification system ensures:
- ✅ **Relevant**: Users only see what matters to them
- ✅ **Professional**: No notification spam
- ✅ **Scalable**: Efficient batch processing
- ✅ **Flexible**: Supports multiple targeting strategies
- ✅ **Maintainable**: Clear, documented APIs

**Remember**: If you're about to notify "all users", ask yourself: "Do they really all need to know this?" The answer is usually no.
