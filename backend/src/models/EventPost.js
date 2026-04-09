const mongoose = require("mongoose");

const eventPostSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true, trim: true, maxlength: 2000 },
  },
  { timestamps: true }
);

eventPostSchema.index({ eventId: 1, createdAt: -1 });

const EventPost = mongoose.model("EventPost", eventPostSchema);

module.exports = { EventPost };
