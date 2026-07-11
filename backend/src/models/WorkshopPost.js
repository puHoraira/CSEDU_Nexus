const mongoose = require("mongoose");

const workshopPostSchema = new mongoose.Schema(
  {
    workshopId: { type: mongoose.Schema.Types.ObjectId, ref: "Workshop", required: true, index: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true, trim: true, maxlength: 2000 },
    images: [{ type: String, trim: true }], // base64 data URLs or hosted URLs
    isAnnouncement: { type: Boolean, default: false },
    stats: {
      totalComments: { type: Number, default: 0 },
      totalLikes: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

workshopPostSchema.index({ workshopId: 1, createdAt: -1 });

const WorkshopPost = mongoose.model("WorkshopPost", workshopPostSchema);

module.exports = { WorkshopPost };
