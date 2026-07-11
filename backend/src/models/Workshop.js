const mongoose = require('mongoose');

const speakerSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  designation:  { type: String },
  organization: { type: String },
  bio:          { type: String },
  avatarUrl:    { type: String },
}, { _id: false });

const materialSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  url:         { type: String, required: true },
  type:        { type: String, enum: ['pdf', 'video', 'link', 'slides', 'code', 'image', 'archive', 'other'], default: 'link' },
  description: { type: String },
  category:    { type: String },
  size:        { type: String },
}, { _id: false });

// A single session/agenda item within a workshop (multi-part, hands-on).
const sessionSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String },
  startTime:   { type: Date },
  endTime:     { type: Date },
  location:    { type: String },       // room or online link for this session
  isOnline:    { type: Boolean, default: false },
  speaker:     { type: String },
  order:       { type: Number, default: 0 },
}, { timestamps: true });

// A prerequisite / pre-work checklist item participants complete before the workshop.
const preworkSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String },
  url:         { type: String },       // optional setup/resource link
  required:    { type: Boolean, default: true },
  order:       { type: Number, default: 0 },
}, { timestamps: true });

// An assignment/task participants submit during the workshop.
const assignmentSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String },
  dueDate:     { type: Date },
  maxPoints:   { type: Number, default: 100 },
  allowFile:   { type: Boolean, default: true },
  allowLink:   { type: Boolean, default: true },
  order:       { type: Number, default: 0 },
}, { timestamps: true });

const workshopSchema = new mongoose.Schema({
  title:            { type: String, required: true, trim: true },
  description:      { type: String, required: true },
  shortDescription: { type: String },
  coverImage:       { type: String },

  // Schedule
  startDate:        { type: Date, required: true },
  endDate:          { type: Date, required: true },
  venue:            { type: String, required: true },
  isOnline:         { type: Boolean, default: false },
  onlineLink:       { type: String },

  // Room Assignment (for physical workshops)
  roomAssignment: {
    enabled: { type: Boolean, default: false },
    rooms: [{
      roomId: { type: mongoose.Schema.Types.ObjectId, ref: "Room" },
      priority: { type: Number, default: 1 }, // 1 = primary, 2 = overflow, etc.
      addedAt: { type: Date, default: Date.now }
    }],
    autoAssignSeats: { type: Boolean, default: true },
    totalSeatsAvailable: { type: Number, default: 0 },
    totalSeatsOccupied: { type: Number, default: 0 }
  },

  // Category & tags
  category:         { type: String, enum: ['Technical', 'Soft Skills', 'Research', 'Career', 'Creative', 'Other'], default: 'Technical' },
  tags:             [{ type: String }],
  level:            { type: String, enum: ['Beginner', 'Intermediate', 'Advanced', 'All Levels'], default: 'All Levels' },

  // Capacity & registration
  capacity:         { type: Number, required: true, min: 1 },
  registrationDeadline: { type: Date },
  requiresApproval: { type: Boolean, default: false },

  // Payment
  isFree:           { type: Boolean, default: true },
  fee:              { type: Number, default: 0, min: 0 },
  currency:         { type: String, default: 'BDT' },

  // Content
  speakers:         [speakerSchema],
  materials:        [materialSchema],
  prerequisites:    [{ type: String }],
  learningOutcomes: [{ type: String }],

  // Interactive workshop content
  sessions:         [sessionSchema],     // agenda / multi-session schedule
  prework:          [preworkSchema],     // pre-work checklist
  assignments:      [assignmentSchema],  // hands-on tasks

  // Completion & certificate config
  completion: {
    minAttendancePercentage: { type: Number, default: 75 },  // % of sessions attended
    requireAllAssignments:   { type: Boolean, default: false },
    certificateEnabled:      { type: Boolean, default: true },
    certificateTitle:        { type: String, default: 'Certificate of Completion' },
    signatoryName:           { type: String, default: '' },
    signatoryTitle:          { type: String, default: 'Workshop Instructor' },
  },

  // Feedback config
  feedbackEnabled:  { type: Boolean, default: true },
  ratingStats: {
    averageRating: { type: Number, default: 0 },
    totalRatings:  { type: Number, default: 0 },
    sumRatings:    { type: Number, default: 0 },
  },

  // Audience Targeting (batch/year based)
  targetAudience: {
    // Empty arrays = open to all
    allowedYears:   [{ type: Number, min: 1, max: 5 }],  // e.g. [1, 2] = 1st and 2nd year only
    allowedBatches: [{ type: Number }],                   // e.g. [2021, 2022]
    allowedRoles:   [{ type: String }],                   // e.g. ['President', 'Vice President', 'EC Member']
    invitedUsers:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // manually invited users
    programType:    { type: String, enum: ['undergrad', 'masters', 'all'], default: 'all' },
  },

  // Status
  status: {
    type: String,
    enum: ['Draft', 'Published', 'Registration_Open', 'Registration_Closed', 'Ongoing', 'Completed', 'Cancelled'],
    default: 'Draft',
  },

  // Organizer
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Stats (denormalized)
  stats: {
    totalRegistrations: { type: Number, default: 0 },
    totalAttendees:     { type: Number, default: 0 },
    totalApproved:      { type: Number, default: 0 },
    totalCompleted:     { type: Number, default: 0 },
    totalCertificates:  { type: Number, default: 0 },
  },

  // Automation flags
  reminderSentAt:  { type: Date },   // 24h-before reminder guard
  autoCompletedAt: { type: Date },   // when scheduler marked it Completed

  // Followers (users following this workshop for updates)
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

module.exports = { Workshop: mongoose.model('Workshop', workshopSchema) };
