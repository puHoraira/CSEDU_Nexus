const mongoose = require("mongoose");

const eventPostSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true, trim: true, maxlength: 2000 },
    images: [{ type: String, trim: true }], // Array of image URLs
    isAnnouncement: { type: Boolean, default: false }, // Flag for important announcements
    stats: {
      totalComments: { type: Number, default: 0 },
      totalLikes: { type: Number, default: 0 }
    }
  },
  { timestamps: true }
);

eventPostSchema.index({ eventId: 1, createdAt: -1 });

const EventPost = mongoose.model("EventPost", eventPostSchema);

module.exports = { EventPost };
