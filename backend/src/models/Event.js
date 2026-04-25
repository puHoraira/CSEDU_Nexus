const mongoose = require("mongoose");

const volunteerEligibilitySchema = new mongoose.Schema(
  {
    allowedYears: [{ type: Number, min: 1, max: 5 }],
    allowedBatches: [{ type: Number, min: 1 }],
  },
  { _id: false }
);

const volunteerPositionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slots: { type: Number, required: true, min: 1 },
    description: { type: String, default: "" },
    requiredYears: [{ type: Number, min: 1, max: 5 }],
    requiredBatches: [{ type: Number, min: 1 }],
  },
  { _id: false }
);

const eventSchema = new mongoose.Schema(
  {
    // Basic Information
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    shortDescription: { type: String, default: "", trim: true, maxlength: 200 },
    
    // Event Details
    eventDate: { type: Date, required: true },
    endDate: { type: Date }, // For multi-day events
    venue: { type: String, required: true, trim: true },
    venueDetails: {
      building: { type: String, default: "", trim: true },
      room: { type: String, default: "", trim: true },
      floor: { type: String, default: "", trim: true },
      mapUrl: { type: String, default: "", trim: true },
      directions: { type: String, default: "", trim: true }
    },
    
    // Categorization & Tags
    category: {
      type: String,
      enum: ["Workshop", "Seminar", "Competition", "Social", "Cultural", "Sports", "Academic", "Networking", "Other"],
      default: "Other"
    },
    tags: [{ type: String, trim: true }],
    
    // Media
    coverImage: { type: String, default: "", trim: true },
    images: [{ type: String, trim: true }],
    videoUrl: { type: String, default: "", trim: true },
    
    // Registration & Capacity
    registrationRequired: { type: Boolean, default: false },
    registrationSettings: {
      openDate: { type: Date },
      closeDate: { type: Date },
      maxParticipants: { type: Number, default: 0 }, // 0 = unlimited
      requiresApproval: { type: Boolean, default: false },
      registrationFee: { type: Number, default: 0 },
      allowWaitlist: { type: Boolean, default: true }
    },
    
    // Attendance Tracking
    attendanceTracking: {
      enabled: { type: Boolean, default: false },
      qrCode: { type: String, default: "" }, // QR code for check-in
      checkInStartTime: { type: Date },
      checkInEndTime: { type: Date },
      totalCheckIns: { type: Number, default: 0 }
    },
    
    // Budget & Finance
    budget: { type: Number, default: 0 },
    actualExpense: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    
    // Status & Visibility
    status: {
      type: String,
      enum: ["Draft", "Planned", "Registration_Open", "Registration_Closed", "Ongoing", "Completed", "Cancelled"],
      default: "Planned",
    },
    visibility: {
      type: String,
      enum: ["Public", "Members_Only", "Invited_Only", "Private"],
      default: "Public"
    },
    isFeatured: { type: Boolean, default: false },
    isPublished: { type: Boolean, default: true },
    
    // Organizers & Contacts
    organizers: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      role: { type: String, default: "Organizer", trim: true },
      responsibilities: { type: String, default: "", trim: true }
    }],
    contactPerson: {
      name: { type: String, default: "", trim: true },
      email: { type: String, default: "", trim: true },
      phone: { type: String, default: "", trim: true }
    },
    
    // Volunteer Program
    volunteerEligibility: {
      type: volunteerEligibilitySchema,
      default: () => ({ allowedYears: [], allowedBatches: [] }),
    },
    volunteerProgram: {
      applicationDeadline: { type: Date, default: null },
      positions: {
        type: [volunteerPositionSchema],
        default: [],
      },
      notes: { type: String, default: "" },
    },
    
    // Speakers/Guests (for seminars, workshops)
    speakers: [{
      name: { type: String, required: true, trim: true },
      designation: { type: String, default: "", trim: true },
      organization: { type: String, default: "", trim: true },
      bio: { type: String, default: "", trim: true },
      photoUrl: { type: String, default: "", trim: true },
      socialMedia: {
        linkedin: { type: String, default: "", trim: true },
        twitter: { type: String, default: "", trim: true },
        website: { type: String, default: "", trim: true }
      }
    }],
    
    // Schedule (for multi-session events)
    schedule: [{
      title: { type: String, required: true, trim: true },
      description: { type: String, default: "", trim: true },
      startTime: { type: Date, required: true },
      endTime: { type: Date, required: true },
      venue: { type: String, default: "", trim: true },
      speaker: { type: String, default: "", trim: true }
    }],
    
    // Requirements & Prerequisites
    prerequisites: { type: String, default: "", trim: true },
    requirements: [{ type: String, trim: true }],
    whatToBring: [{ type: String, trim: true }],
    
    // Statistics
    stats: {
      totalRegistrations: { type: Number, default: 0 },
      totalAttendees: { type: Number, default: 0 },
      totalVolunteers: { type: Number, default: 0 },
      totalPosts: { type: Number, default: 0 },
      totalComments: { type: Number, default: 0 },
      totalFollowers: { type: Number, default: 0 },
      averageRating: { type: Number, default: 0, min: 0, max: 5 }
    },
    
    // Followers (users following this event for updates)
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    
    // Metadata
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    publishedAt: { type: Date },
    cancelledAt: { type: Date },
    cancellationReason: { type: String, default: "", trim: true }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for event duration
eventSchema.virtual('duration').get(function() {
  if (!this.endDate) return null;
  const diff = this.endDate - this.eventDate;
  return Math.ceil(diff / (1000 * 60 * 60 * 24)); // Days
});

// Virtual for registration status
eventSchema.virtual('registrationStatus').get(function() {
  if (!this.registrationRequired) return 'Not Required';
  
  const now = new Date();
  const openDate = this.registrationSettings.openDate;
  const closeDate = this.registrationSettings.closeDate;
  
  if (openDate && now < openDate) return 'Not Open';
  if (closeDate && now > closeDate) return 'Closed';
  
  const maxParticipants = this.registrationSettings.maxParticipants;
  if (maxParticipants > 0 && this.stats.totalRegistrations >= maxParticipants) {
    return this.registrationSettings.allowWaitlist ? 'Waitlist' : 'Full';
  }
  
  return 'Open';
});

// Virtual for is past event
eventSchema.virtual('isPastEvent').get(function() {
  const endDate = this.endDate || this.eventDate;
  return endDate < new Date();
});

// Virtual for is upcoming
eventSchema.virtual('isUpcoming').get(function() {
  return this.eventDate > new Date();
});

// Virtual for days until event
eventSchema.virtual('daysUntilEvent').get(function() {
  const diff = this.eventDate - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Indexes for efficient queries
eventSchema.index({ eventDate: 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ category: 1 });
eventSchema.index({ visibility: 1 });
eventSchema.index({ isFeatured: -1, eventDate: 1 });
eventSchema.index({ tags: 1 });
eventSchema.index({ createdBy: 1 });
eventSchema.index({ 'registrationSettings.openDate': 1 });
eventSchema.index({ 'registrationSettings.closeDate': 1 });

const Event = mongoose.model("Event", eventSchema);

module.exports = { Event };
