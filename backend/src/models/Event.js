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
    title: { type: String, required: true },
    description: { type: String, default: "" },
    eventDate: { type: Date, required: true },
    venue: { type: String, required: true },
    budget: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["Planned", "Ongoing", "Completed", "Cancelled"],
      default: "Planned",
    },
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
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

const Event = mongoose.model("Event", eventSchema);

module.exports = { Event };
