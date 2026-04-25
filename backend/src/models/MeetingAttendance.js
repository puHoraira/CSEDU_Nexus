const mongoose = require("mongoose");

const meetingAttendanceSchema = new mongoose.Schema(
  {
    meetingId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Meeting", 
      required: true,
      index: true
    },
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true,
      index: true
    },
    memberId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Member",
      index: true
    },
    
    // Attendance Status
    present: { type: Boolean, required: true, default: false },
    attendanceStatus: {
      type: String,
      enum: ["Present", "Absent", "Late", "Excused", "Left_Early"],
      default: "Absent"
    },
    
    // Check-in/Check-out
    checkInTime: { type: Date },
    checkOutTime: { type: Date },
    checkInMethod: {
      type: String,
      enum: ["Manual", "QR_Code", "Biometric", "Auto_Online", "Self_Reported"],
      default: "Manual"
    },
    checkInLocation: {
      latitude: { type: Number },
      longitude: { type: Number },
      address: { type: String, default: "" }
    },
    
    // Late/Early Leave
    isLate: { type: Boolean, default: false },
    lateByMinutes: { type: Number, default: 0 },
    leftEarly: { type: Boolean, default: false },
    leftEarlyByMinutes: { type: Number, default: 0 },
    
    // Duration
    durationMinutes: { type: Number, default: 0 },
    
    // Excuse/Reason
    excused: { type: Boolean, default: false },
    excuseReason: { type: String, default: "", trim: true },
    excuseDocument: { type: String, default: "", trim: true },
    excuseApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    excuseApprovedAt: { type: Date },
    
    // Notes
    notes: { type: String, default: "", trim: true },
    
    // Metadata
    signedAt: { type: Date, default: Date.now },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    
    // Verification
    verified: { type: Boolean, default: false },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    verifiedAt: { type: Date }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Compound indexes
meetingAttendanceSchema.index({ meetingId: 1, userId: 1 }, { unique: true });
meetingAttendanceSchema.index({ meetingId: 1, attendanceStatus: 1 });
meetingAttendanceSchema.index({ userId: 1, present: 1 });
meetingAttendanceSchema.index({ memberId: 1, present: 1 });

// Virtual for attendance duration
meetingAttendanceSchema.virtual('attendanceDuration').get(function() {
  if (!this.checkInTime || !this.checkOutTime) return 0;
  return Math.round((this.checkOutTime - this.checkInTime) / (1000 * 60)); // minutes
});

// Methods
meetingAttendanceSchema.methods.markPresent = function(checkInTime, method = "Manual") {
  this.present = true;
  this.attendanceStatus = "Present";
  this.checkInTime = checkInTime || new Date();
  this.checkInMethod = method;
};

meetingAttendanceSchema.methods.markLate = function(checkInTime, lateByMinutes, method = "Manual") {
  this.present = true;
  this.attendanceStatus = "Late";
  this.isLate = true;
  this.lateByMinutes = lateByMinutes;
  this.checkInTime = checkInTime || new Date();
  this.checkInMethod = method;
};

meetingAttendanceSchema.methods.markAbsent = function(reason = "") {
  this.present = false;
  this.attendanceStatus = "Absent";
  this.notes = reason;
};

meetingAttendanceSchema.methods.markExcused = function(reason, document = "") {
  this.present = false;
  this.attendanceStatus = "Excused";
  this.excused = true;
  this.excuseReason = reason;
  this.excuseDocument = document;
};

meetingAttendanceSchema.methods.checkOut = function(checkOutTime) {
  this.checkOutTime = checkOutTime || new Date();
  if (this.checkInTime) {
    this.durationMinutes = Math.round((this.checkOutTime - this.checkInTime) / (1000 * 60));
  }
};

// Static methods
meetingAttendanceSchema.statics.getAttendanceRate = async function(userId, startDate, endDate) {
  const query = { userId };
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = startDate;
    if (endDate) query.createdAt.$lte = endDate;
  }
  
  const total = await this.countDocuments(query);
  const present = await this.countDocuments({ ...query, present: true });
  
  return {
    total,
    present,
    absent: total - present,
    rate: total > 0 ? Math.round((present / total) * 100) : 0
  };
};

meetingAttendanceSchema.statics.getConsecutiveAbsences = async function(userId, limit = 10) {
  const attendances = await this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('meetingId', 'title meetingDate');
  
  let consecutiveAbsences = 0;
  for (const attendance of attendances) {
    if (!attendance.present && !attendance.excused) {
      consecutiveAbsences++;
    } else {
      break;
    }
  }
  
  return {
    consecutiveAbsences,
    recentAttendances: attendances
  };
};

const MeetingAttendance = mongoose.model("MeetingAttendance", meetingAttendanceSchema);

module.exports = { MeetingAttendance };
