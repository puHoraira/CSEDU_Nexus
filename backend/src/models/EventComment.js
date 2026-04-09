const mongoose = require("mongoose");

const eventCommentSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    postId: { type: mongoose.Schema.Types.ObjectId, ref: "EventPost", required: true, index: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true, trim: true, maxlength: 1200 },
  },
  { timestamps: true }
);

eventCommentSchema.index({ postId: 1, createdAt: 1 });

const EventComment = mongoose.model("EventComment", eventCommentSchema);

module.exports = { EventComment };
