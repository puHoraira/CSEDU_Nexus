const mongoose = require("mongoose");

const meetingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    agenda: { type: String, default: "" },
    meetingDate: { type: Date, required: true },
    venue: { type: String, required: true },
    meetingMode: { type: String, enum: ["Online", "Offline"], default: "Offline" },
    roomId: { type: String, unique: true, sparse: true, index: true },
    calledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["Scheduled", "Completed", "Cancelled"],
      default: "Scheduled",
    },
    minutes: { type: String, default: "" },
  },
  { timestamps: true }
);

const Meeting = mongoose.model("Meeting", meetingSchema);

module.exports = { Meeting };
