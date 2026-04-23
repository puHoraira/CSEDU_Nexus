const mongoose = require("mongoose");

const volunteerSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true },
    role: { type: String, default: "Volunteer" },
    preferredPositions: [{ type: String, trim: true }],
    availability: { type: String, default: "" },
    message: { type: String, default: "" },
    status: {
      type: String,
      enum: ["Pending", "Shortlisted", "Waitlisted", "Approved", "Rejected"],
      default: "Pending",
    },
    assignedPosition: { type: String, default: "" },
    reviewNote: { type: String, default: "" },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

volunteerSchema.index({ eventId: 1, memberId: 1 }, { unique: true });

const Volunteer = mongoose.model("Volunteer", volunteerSchema);

module.exports = { Volunteer };
