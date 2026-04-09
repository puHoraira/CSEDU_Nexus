const mongoose = require("mongoose");

const meetingAttendanceSchema = new mongoose.Schema(
  {
    meetingId: { type: mongoose.Schema.Types.ObjectId, ref: "Meeting", required: true },
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true },
    present: { type: Boolean, required: true },
    signedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

meetingAttendanceSchema.index({ meetingId: 1, memberId: 1 }, { unique: true });

const MeetingAttendance = mongoose.model("MeetingAttendance", meetingAttendanceSchema);

module.exports = { MeetingAttendance };
