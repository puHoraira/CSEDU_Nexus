const mongoose = require("mongoose");

// A participant's submission for a workshop assignment.
const workshopSubmissionSchema = new mongoose.Schema(
  {
    workshopId:   { type: mongoose.Schema.Types.ObjectId, ref: "Workshop", required: true, index: true },
    assignmentId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    userId:       { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    content:   { type: String, trim: true, maxlength: 4000 }, // notes/answer text
    fileUrl:   { type: String }, // base64 data URL or hosted URL
    fileName:  { type: String },
    linkUrl:   { type: String },

    status:    { type: String, enum: ["Submitted", "Reviewed", "Returned"], default: "Submitted" },
    grade:     { type: Number, min: 0 },
    feedback:  { type: String },
    reviewedBy:{ type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt:{ type: Date },
  },
  { timestamps: true }
);

workshopSubmissionSchema.index({ workshopId: 1, assignmentId: 1, userId: 1 }, { unique: true });

const WorkshopSubmission = mongoose.model("WorkshopSubmission", workshopSubmissionSchema);

module.exports = { WorkshopSubmission };
