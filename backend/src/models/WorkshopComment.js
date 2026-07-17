const mongoose = require("mongoose");

const workshopCommentSchema = new mongoose.Schema(
  {
    workshopId: { type: mongoose.Schema.Types.ObjectId, ref: "Workshop", required: true, index: true },
    postId: { type: mongoose.Schema.Types.ObjectId, ref: "WorkshopPost", required: true, index: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, trim: true, maxlength: 1200 },
    images: { type: [String], default: [], validate: [(v) => v.length <= 4, "Max 4 images allowed"] },
  },
  { timestamps: true }
);

workshopCommentSchema.index({ postId: 1, createdAt: 1 });

const WorkshopComment = mongoose.model("WorkshopComment", workshopCommentSchema);

module.exports = { WorkshopComment };
