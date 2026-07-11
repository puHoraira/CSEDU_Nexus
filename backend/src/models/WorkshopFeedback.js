const mongoose = require("mongoose");

// Post-completion feedback + star rating from a participant.
const workshopFeedbackSchema = new mongoose.Schema(
  {
    workshopId: { type: mongoose.Schema.Types.ObjectId, ref: "Workshop", required: true, index: true },
    userId:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    rating:     { type: Number, required: true, min: 1, max: 5 },
    comment:    { type: String, trim: true, maxlength: 2000 },

    // Optional granular ratings
    contentRating:    { type: Number, min: 1, max: 5 },
    instructorRating: { type: Number, min: 1, max: 5 },
    organizationRating:{ type: Number, min: 1, max: 5 },

    wouldRecommend: { type: Boolean },
    isAnonymous:    { type: Boolean, default: false },
  },
  { timestamps: true }
);

// One feedback per participant per workshop.
workshopFeedbackSchema.index({ workshopId: 1, userId: 1 }, { unique: true });

const WorkshopFeedback = mongoose.model("WorkshopFeedback", workshopFeedbackSchema);

module.exports = { WorkshopFeedback };
