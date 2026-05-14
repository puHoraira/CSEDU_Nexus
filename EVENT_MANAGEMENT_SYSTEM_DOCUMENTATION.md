# Event Management System Documentation

## Overview

The CSEDU Nexus Event Management System is a comprehensive platform for creating, managing, and tracking club events. It includes features for event registration, volunteer management, attendance tracking, photo galleries, and post-event feedback.

## Features

### 1. Event Creation & Management
- **Rich Event Details**: Title, description, dates, venue, category, tags
- **Media Support**: Cover images, photo galleries, video URLs
- **Multiple Event Types**: Workshops, seminars, competitions, social events, cultural programs, sports, academic events
- **Multi-Day Events**: Support for events spanning multiple days
- **Event Scheduling**: Detailed schedule for multi-session events
- **Speaker Management**: Add speakers/guests with bios and social links

### 2. Event Registration System
- **Flexible Registration**: Optional or required registration
- **Registration Settings**:
  - Open/close dates
  - Maximum participants
  - Registration fees
  - Approval workflow
  - Waitlist support
- **Participant Information**: Name, email, phone, student ID, batch
- **Additional Details**: Dietary restrictions, special needs, t-shirt size, expectations
- **Payment Integration**: Track payment status, methods, transaction IDs
- **Registration Numbers**: Auto-generated unique registration numbers

### 3. Attendance Tracking
- **QR Code Check-In**: Generate QR codes for quick check-in
- **Multiple Check-In Methods**: QR code, manual, self check-in
- **Check-In Window**: Define check-in start and end times
- **Attendance Statistics**: Track total check-ins, no-shows
- **Check-Out Tracking**: Optional check-out time recording

### 4. Volunteer Management
- **Position-Based Recruitment**: Define volunteer positions with slots
- **Eligibility Criteria**: Filter by year, batch
- **Application Workflow**: Apply, review, approve/reject
- **Position Assignment**: Assign volunteers to specific positions
- **Volunteer Tracking**: Track volunteer hours and contributions

### 5. Event Feed & Updates
- **Event Posts**: Share updates, announcements, photos
- **Comments**: Allow participants to comment on posts
- **Real-Time Updates**: Keep participants informed
- **Engagement Tracking**: Track posts and comments count

### 6. Photo Gallery
- **Album Management**: Organize photos into albums
- **Photo Metadata**: Captions, categories, tags
- **People Tagging**: Tag people in photos with position markers
- **Engagement**: Likes, views, downloads tracking
- **Approval Workflow**: Review and approve photos before publishing
- **Featured Photos**: Highlight best photos

### 7. Feedback & Ratings
- **Post-Event Feedback**: Collect participant feedback
- **Rating System**: 1-5 star ratings
- **Comments**: Detailed feedback comments
- **Recommendations**: Would recommend to others
- **Analytics**: Average ratings, feedback trends

### 8. Certificate Generation
- **Attendance Certificates**: Auto-generate for attendees
- **Certificate Numbers**: Unique certificate identifiers
- **Download Links**: Provide downloadable certificates
- **Volunteer Certificates**: Special certificates for volunteers

## Data Models

### Event Model
```javascript
{
  // Basic Information
  title: String (required),
  description: String,
  shortDescription: String (max 200 chars),
  
  // Event Details
  eventDate: Date (required),
  endDate: Date,
  venue: String (required),
  venueDetails: {
    building, room, floor, mapUrl, directions
  },
  
  // Categorization
  category: Enum (Workshop, Seminar, Competition, etc.),
  tags: [String],
  
  // Media
  coverImage: String,
  images: [String],
  videoUrl: String,
  
  // Registration
  registrationRequired: Boolean,
  registrationSettings: {
    openDate, closeDate, maxParticipants,
    requiresApproval, registrationFee, allowWaitlist
  },
  
  // Attendance
  attendanceTracking: {
    enabled, qrCode, checkInStartTime,
    checkInEndTime, totalCheckIns
  },
  
  // Finance
  budget: Number,
  actualExpense: Number,
  revenue: Number,
  
  // Status
  status: Enum (Draft, Planned, Registration_Open, etc.),
  visibility: Enum (Public, Members_Only, etc.),
  isFeatured: Boolean,
  isPublished: Boolean,
  
  // Organizers
  organizers: [{userId, role, responsibilities}],
  contactPerson: {name, email, phone},
  
  // Speakers
  speakers: [{name, designation, organization, bio, photoUrl, socialMedia}],
  
  // Schedule
  schedule: [{title, description, startTime, endTime, venue, speaker}],
  
  // Requirements
  prerequisites: String,
  requirements: [String],
  whatToBring: [String],
  
  // Statistics
  stats: {
    totalRegistrations, totalAttendees, totalVolunteers,
    totalPosts, totalComments, averageRating
  },
  
  // Metadata
  createdBy: ObjectId,
  lastModifiedBy: ObjectId,
  publishedAt: Date,
  cancelledAt: Date,
  cancellationReason: String
}
```

### EventRegistration Model
```javascript
{
  eventId: ObjectId (required),
  userId: ObjectId (required),
  memberId: ObjectId,
  
  registrationNumber: String (unique, auto-generated),
  registrationDate: Date,
  
  status: Enum (Pending, Approved, Rejected, Waitlisted, Cancelled, Attended, No_Show),
  statusReason: String,
  
  participantInfo: {
    name, email, phone, studentId, batch, department
  },
  
  additionalInfo: {
    dietaryRestrictions, specialNeeds, emergencyContact,
    tshirtSize, expectations, howDidYouHear
  },
  
  payment: {
    required, amount, status, method,
    transactionId, paidAt, receiptUrl
  },
  
  attendance: {
    checkedIn, checkInTime, checkInMethod,
    checkedInBy, checkOutTime
  },
  
  feedback: {
    submitted, rating, comment,
    wouldRecommend, submittedAt
  },
  
  certificate: {
    issued, certificateNumber, issuedAt, downloadUrl
  },
  
  approvedBy, approvedAt, rejectedBy, rejectedAt,
  cancelledAt, cancellationReason
}
```

### EventGallery Model
```javascript
{
  eventId: ObjectId (required),
  
  albumName: String,
  albumDescription: String,
  
  photoUrl: String (required),
  thumbnailUrl: String,
  caption: String,
  
  fileSize: Number,
  dimensions: {width, height},
  format: String,
  
  category: Enum (Event_Setup, Speakers, Participants, etc.),
  tags: [String],
  
  taggedPeople: [{userId, name, position: {x, y}}],
  
  isPublic: Boolean,
  isFeatured: Boolean,
  status: Enum (Pending, Approved, Rejected, Hidden),
  
  likes: Number,
  likedBy: [ObjectId],
  views: Number,
  downloads: Number,
  
  uploadedBy: ObjectId,
  uploadDate: Date,
  
  approvedBy, approvedAt, rejectedBy, rejectedAt,
  displayOrder: Number
}
```

## API Endpoints

### Event Management

#### Create Event
```
POST /api/events
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Web Development Workshop",
  "description": "Learn modern web development with React and Node.js",
  "shortDescription": "Hands-on workshop on full-stack web development",
  "eventDate": "2024-12-15T10:00:00Z",
  "endDate": "2024-12-15T16:00:00Z",
  "venue": "CSE Seminar Room",
  "venueDetails": {
    "building": "Science Complex",
    "room": "301",
    "floor": "3rd Floor"
  },
  "category": "Workshop",
  "tags": ["web-development", "react", "nodejs"],
  "coverImage": "https://example.com/cover.jpg",
  "registrationRequired": true,
  "registrationSettings": {
    "openDate": "2024-11-01T00:00:00Z",
    "closeDate": "2024-12-10T23:59:59Z",
    "maxParticipants": 50,
    "requiresApproval": false,
    "registrationFee": 0,
    "allowWaitlist": true
  },
  "attendanceTracking": {
    "enabled": true,
    "checkInStartTime": "2024-12-15T09:30:00Z",
    "checkInEndTime": "2024-12-15T10:30:00Z"
  },
  "speakers": [{
    "name": "John Doe",
    "designation": "Senior Developer",
    "organization": "Tech Company",
    "bio": "10+ years of experience in web development"
  }],
  "schedule": [{
    "title": "Introduction to React",
    "description": "Basics of React components and hooks",
    "startTime": "2024-12-15T10:00:00Z",
    "endTime": "2024-12-15T12:00:00Z",
    "speaker": "John Doe"
  }]
}
```

#### List Events
```
GET /api/events?category=Workshop&status=Planned&featured=true
Authorization: Bearer <token>

Query Parameters:
- category: Filter by category
- status: Filter by status
- featured: Show only featured events
- upcoming: Show only upcoming events
- past: Show only past events
- search: Search in title and description
- page: Page number (default: 1)
- limit: Items per page (default: 20)
```

#### Get Event Details
```
GET /api/events/:id
Authorization: Bearer <token>

Response includes:
- Full event details
- Organizers information
- Speakers list
- Schedule
- Registration statistics
- Volunteer positions
```

#### Update Event
```
PUT /api/events/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "Registration_Open",
  "actualExpense": 5000,
  "stats": {
    "totalRegistrations": 45
  }
}
```

#### Delete Event
```
DELETE /api/events/:id
Authorization: Bearer <token>
```

### Event Registration

#### Register for Event
```
POST /api/events/:id/register
Authorization: Bearer <token>
Content-Type: application/json

{
  "participantInfo": {
    "name": "Abu Mamun",
    "email": "mamun@du.ac.bd",
    "phone": "+8801712345678",
    "studentId": "2020-02-045",
    "batch": 2020
  },
  "additionalInfo": {
    "dietaryRestrictions": "Vegetarian",
    "tshirtSize": "L",
    "expectations": "Learn React hooks and state management"
  }
}

Response:
{
  "registrationNumber": "WEB24001",
  "status": "Approved",
  "message": "Registration successful"
}
```

#### Get My Registrations
```
GET /api/events/registrations/my
Authorization: Bearer <token>

Response: List of all user's event registrations
```

#### Cancel Registration
```
DELETE /api/events/:id/register
Authorization: Bearer <token>
Content-Type: application/json

{
  "cancellationReason": "Schedule conflict"
}
```

### Attendance Management

#### Check-In to Event
```
POST /api/events/:id/checkin
Authorization: Bearer <token>
Content-Type: application/json

{
  "method": "QR_Code",
  "qrCode": "EVENT_QR_CODE_STRING"
}

Response:
{
  "success": true,
  "checkInTime": "2024-12-15T10:15:00Z",
  "message": "Check-in successful"
}
```

#### Manual Check-In (Organizers)
```
POST /api/events/:id/checkin/:registrationId
Authorization: Bearer <token>
Content-Type: application/json

{
  "method": "Manual"
}
```

#### Get Attendance List
```
GET /api/events/:id/attendance
Authorization: Bearer <token>

Response: List of all registrations with check-in status
```

### Photo Gallery

#### Upload Photo
```
POST /api/events/:id/gallery
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "photo": <file>,
  "caption": "Group photo with speakers",
  "category": "Group_Photos",
  "tags": ["speakers", "participants"]
}
```

#### Get Event Gallery
```
GET /api/events/:id/gallery?category=Speakers&featured=true
Authorization: Bearer <token>

Query Parameters:
- category: Filter by category
- featured: Show only featured photos
- album: Filter by album name
```

#### Like Photo
```
POST /api/events/gallery/:photoId/like
Authorization: Bearer <token>
```

#### Tag Person in Photo
```
POST /api/events/gallery/:photoId/tag
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "user_id",
  "name": "John Doe",
  "position": {
    "x": 45.5,
    "y": 30.2
  }
}
```

### Feedback & Ratings

#### Submit Feedback
```
POST /api/events/:id/feedback
Authorization: Bearer <token>
Content-Type: application/json

{
  "rating": 5,
  "comment": "Excellent workshop! Learned a lot about React.",
  "wouldRecommend": true
}
```

#### Get Event Feedback
```
GET /api/events/:id/feedback
Authorization: Bearer <token>

Response: List of all feedback with ratings and comments
```

## Frontend Components

### Event List Page
- Grid/List view toggle
- Category filters
- Search functionality
- Featured events section
- Upcoming events section
- Past events section
- Pagination

### Event Details Page
- Event header with cover image
- Event information (date, time, venue)
- Description and prerequisites
- Speakers section
- Schedule timeline
- Registration button/status
- Volunteer positions
- Event feed/updates
- Photo gallery
- Map/directions

### Event Registration Form
- Participant information
- Additional details
- Payment information (if required)
- Terms and conditions
- Confirmation page

### Event Dashboard (Organizers)
- Event statistics
- Registration list
- Attendance tracking
- Volunteer management
- Photo gallery management
- Feedback summary

### Event Calendar View
- Monthly calendar
- Event markers
- Quick event preview
- Filter by category

## User Roles & Permissions

### Guest (Non-logged-in)
- View public events
- View event details
- Cannot register

### General Member
- View all events
- Register for events
- Submit feedback
- Upload photos (with approval)
- Apply as volunteer

### Event Organizer
- Create events
- Edit own events
- Manage registrations
- Track attendance
- Manage volunteers
- Approve photos
- View feedback

### EC Member
- All organizer permissions
- Feature events
- Manage all events
- Generate reports

### Moderator/Chairman
- All permissions
- Delete events
- Override settings
- Access analytics

## Event Lifecycle

### 1. Planning Phase
- Create event (Draft status)
- Add details, speakers, schedule
- Set registration settings
- Define volunteer positions
- Review and publish

### 2. Registration Phase
- Open registration
- Review applications (if approval required)
- Approve/reject registrations
- Manage waitlist
- Send reminders

### 3. Pre-Event Phase
- Send event details to registered participants
- Confirm attendance
- Assign volunteers
- Generate QR codes
- Prepare materials

### 4. Event Day
- Check-in participants
- Track attendance
- Share live updates
- Take photos
- Manage volunteers

### 5. Post-Event Phase
- Mark event as completed
- Collect feedback
- Upload photos
- Generate certificates
- Create event report
- Archive event

## Statistics & Analytics

### Event Statistics
- Total registrations
- Attendance rate
- No-show rate
- Average rating
- Feedback summary
- Revenue vs budget
- Volunteer participation

### Participant Analytics
- Registration trends
- Demographics (batch, year)
- Repeat participants
- Feedback patterns

### Overall Analytics
- Events per category
- Popular event types
- Attendance trends
- Volunteer engagement
- Revenue analysis

## Best Practices

### For Event Organizers
1. Create events well in advance
2. Set clear registration deadlines
3. Provide detailed event information
4. Communicate regularly with participants
5. Track attendance accurately
6. Collect feedback promptly
7. Share photos and updates

### For Participants
1. Register early
2. Provide accurate information
3. Attend registered events
4. Check in on time
5. Provide constructive feedback
6. Share event photos
7. Recommend to others

### For Administrators
1. Monitor event quality
2. Review feedback regularly
3. Ensure constitutional compliance
4. Support organizers
5. Promote successful events
6. Archive completed events
7. Generate periodic reports

## Integration Points

### With Registration System
- Verify student information
- Check membership status
- Validate eligibility

### With Certificate System
- Generate attendance certificates
- Track volunteer hours
- Issue participation certificates

### With Finance System
- Track registration fees
- Manage event budgets
- Generate financial reports

### With Notification System
- Send registration confirmations
- Event reminders
- Update notifications
- Feedback requests

## Future Enhancements

### Planned Features
1. **Live Streaming**: Stream events online
2. **Virtual Events**: Support for online events
3. **Ticketing System**: Advanced ticketing with QR codes
4. **Sponsor Management**: Track event sponsors
5. **Resource Booking**: Book venues and equipment
6. **Team Management**: Organize event teams
7. **Budget Tracking**: Detailed expense tracking
8. **Survey Integration**: Pre/post-event surveys
9. **Social Sharing**: Share events on social media
10. **Mobile App**: Dedicated mobile app for events

### Integration Opportunities
- Google Calendar sync
- Email marketing platforms
- Payment gateways
- Video conferencing tools
- Photo sharing platforms

---

**Last Updated**: 2024
**Version**: 1.0.0
**Maintained By**: CSEDU Nexus Development Team
