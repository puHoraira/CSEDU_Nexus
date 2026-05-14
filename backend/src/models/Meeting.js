const mongoose = require("mongoose");

const agendaItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    presenter: { type: String, default: "", trim: true },
    duration: { type: Number, default: 0 }, // in minutes
    order: { type: Number, required: true },
    status: {
      type: String,
      enum: ["Pending", "In_Progress", "Completed", "Deferred"],
      default: "Pending"
    },
    decision: { type: String, default: "", trim: true },
    actionItems: [{
      description: { type: String, required: true },
      assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      dueDate: { type: Date },
      status: {
        type: String,
        enum: ["Pending", "In_Progress", "Completed"],
        default: "Pending"
      }
    }]
  },
  { _id: true }
);

const meetingParticipantSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: {
      type: String,
      enum: ["Organizer", "Required", "Optional", "Observer"],
      default: "Required"
    },
    responseStatus: {
      type: String,
      enum: ["Pending", "Accepted", "Declined", "Tentative"],
      default: "Pending"
    },
    respondedAt: { type: Date }
  },
  { _id: false }
);

const meetingSchema = new mongoose.Schema(
  {
    // Basic Information
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    agenda: { type: String, default: "", trim: true }, // Legacy field
    agendaItems: [agendaItemSchema],
    
    // Scheduling
    meetingDate: { type: Date, required: true, index: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    timezone: { type: String, default: "Asia/Dhaka" },
    
    // Location
    venue: { type: String, required: true, trim: true },
    venueDetails: {
      building: { type: String, default: "", trim: true },
      room: { type: String, default: "", trim: true },
      floor: { type: String, default: "", trim: true },
      mapUrl: { type: String, default: "", trim: true }
    },
    
    // Meeting Mode
    meetingMode: {
      type: String,
      enum: ["Online", "Offline", "Hybrid"],
      default: "Offline"
    },
    onlineDetails: {
      platform: {
        type: String,
        enum: ["Zego", "Zoom", "Google_Meet", "Microsoft_Teams", "Other"],
        default: "Zego"
      },
      roomId: { type: String, sparse: true, index: true },
      meetingLink: { type: String, default: "", trim: true },
      meetingPassword: { type: String, default: "", trim: true },
      dialInNumber: { type: String, default: "", trim: true }
    },
    
    // Participants
    calledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    participants: [meetingParticipantSchema],
    
    // Meeting Type & Category
    meetingType: {
      type: String,
      enum: ["Regular", "Emergency", "Special", "Annual_General", "Executive"],
      default: "Regular"
    },
    category: {
      type: String,
      enum: ["EC_Meeting", "General_Body", "Committee", "Planning", "Review", "Other"],
      default: "EC_Meeting"
    },

    // Audience Targeting (batch/year based)
    targetAudience: {
      allowedYears:   [{ type: Number, min: 1, max: 5 }],
      allowedBatches: [{ type: Number }],
      programType:    { type: String, enum: ['undergrad', 'masters', 'all'], default: 'all' },
    },
    
    // Status & Lifecycle
    status: {
      type: String,
      enum: ["Draft", "Scheduled", "In_Progress", "Completed", "Cancelled", "Postponed"],
      default: "Scheduled",
      index: true
    },
    
    // Attendance
    attendanceTracking: {
      enabled: { type: Boolean, default: true },
      method: {
        type: String,
        enum: ["Manual", "QR_Code", "Biometric", "Auto_Online"],
        default: "Manual"
      },
      qrCode: { type: String, default: "" },
      checkInStartTime: { type: Date },
      checkInEndTime: { type: Date },
      lateThreshold: { type: Number, default: 15 }, // minutes
      requireCheckOut: { type: Boolean, default: false }
    },
    
    // Minutes & Documentation
    minutes: { type: String, default: "", trim: true },
    minutesDocument: { type: String, default: "", trim: true }, // URL to document
    decisions: [{
      title: { type: String, required: true },
      description: { type: String, default: "" },
      votingResult: {
        inFavor: { type: Number, default: 0 },
        against: { type: Number, default: 0 },
        abstain: { type: Number, default: 0 }
      },
      status: {
        type: String,
        enum: ["Approved", "Rejected", "Deferred"],
        default: "Approved"
      }
    }],
    attachments: [{
      name: { type: String, required: true },
      url: { type: String, required: true },
      type: { type: String, default: "" },
      uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      uploadedAt: { type: Date, default: Date.now }
    }],
    
    // Recording
    recording: {
      enabled: { type: Boolean, default: false },
      url: { type: String, default: "" },
      duration: { type: Number, default: 0 }, // in seconds
      startedAt: { type: Date },
      endedAt: { type: Date }
    },
    
    // Notifications & Reminders
    reminders: [{
      type: {
        type: String,
        enum: ["Email", "SMS", "Push", "In_App"],
        default: "In_App"
      },
      timing: { type: Number, required: true }, // minutes before meeting
      sent: { type: Boolean, default: false },
      sentAt: { type: Date }
    }],
    
    // Statistics
    stats: {
      totalParticipants: { type: Number, default: 0 },
      totalAttended: { type: Number, default: 0 },
      totalAbsent: { type: Number, default: 0 },
      totalLate: { type: Number, default: 0 },
      attendanceRate: { type: Number, default: 0 },
      averageCheckInTime: { type: Number, default: 0 }
    },
    
    // Metadata
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    startedAt: { type: Date },
    completedAt: { type: Date },
    cancelledAt: { type: Date },
    cancellationReason: { type: String, default: "", trim: true },
    postponedTo: { type: Date },
    postponementReason: { type: String, default: "", trim: true }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
meetingSchema.index({ meetingDate: 1, status: 1 });
meetingSchema.index({ calledBy: 1 });
meetingSchema.index({ "participants.userId": 1 });
meetingSchema.index({ category: 1, meetingType: 1 });
meetingSchema.index({ "onlineDetails.roomId": 1 });

// Virtual for duration
meetingSchema.virtual('duration').get(function() {
  if (!this.startTime || !this.endTime) return 0;
  return Math.round((this.endTime - this.startTime) / (1000 * 60)); // minutes
});

// Virtual for is past
meetingSchema.virtual('isPast').get(function() {
  return this.endTime < new Date();
});

// Virtual for is upcoming
meetingSchema.virtual('isUpcoming').get(function() {
  return this.startTime > new Date();
});

// Virtual for is ongoing
meetingSchema.virtual('isOngoing').get(function() {
  const now = new Date();
  return this.startTime <= now && this.endTime >= now;
});

// Virtual for days until meeting
meetingSchema.virtual('daysUntilMeeting').get(function() {
  const diff = this.startTime - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Methods
meetingSchema.methods.canStart = function() {
  return this.status === "Scheduled" && !this.isPast;
};

meetingSchema.methods.canComplete = function() {
  return this.status === "In_Progress" || (this.status === "Scheduled" && this.isPast);
};

meetingSchema.methods.canCancel = function() {
  return ["Draft", "Scheduled"].includes(this.status);
};

meetingSchema.methods.updateStats = async function() {
  const MeetingAttendance = mongoose.model("MeetingAttendance");
  const attendances = await MeetingAttendance.find({ meetingId: this._id });
  
  this.stats.totalAttended = attendances.filter(a => a.present).length;
  this.stats.totalAbsent = attendances.filter(a => !a.present).length;
  this.stats.totalLate = attendances.filter(a => a.isLate).length;
  this.stats.attendanceRate = this.stats.totalParticipants > 0
    ? Math.round((this.stats.totalAttended / this.stats.totalParticipants) * 100)
    : 0;
  
  await this.save();
};

const Meeting = mongoose.model("Meeting", meetingSchema);

module.exports = { Meeting };
