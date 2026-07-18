const mongoose = require("mongoose");

const postCommentSchema = new mongoose.Schema(
  {
    postId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Post", 
      required: true, 
      index: true 
    },
    authorId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true,
      index: true 
    },
    content: { 
      type: String, 
      required: true,
      trim: true, 
      maxlength: 2000 
    },
    images: { 
      type: [String], 
      default: [], 
      validate: [
        (v) => v.length <= 4, 
        "Maximum 4 images allowed per comment"
      ] 
    },
    // Parent comment for nested replies
    parentCommentId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "PostComment",
      default: null,
      index: true
    },
    // User mentions in the comment (for notifications)
    mentions: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      userName: { type: String, trim: true }
    }],
    // Moderation
    isDeleted: { 
      type: Boolean, 
      default: false 
    },
    deletedAt: { 
      type: Date, 
      default: null 
    },
    deletedBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User",
      default: null
    },
    // Engagement statistics
    stats: {
      totalLikes: { type: Number, default: 0 },
      totalReplies: { type: Number, default: 0 }
    },
    // Edit tracking
    isEdited: { 
      type: Boolean, 
      default: false 
    },
    lastEditedAt: { 
      type: Date 
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for efficient queries
postCommentSchema.index({ postId: 1, createdAt: 1 });
postCommentSchema.index({ postId: 1, parentCommentId: 1, createdAt: 1 });
postCommentSchema.index({ authorId: 1, createdAt: -1 });
postCommentSchema.index({ "mentions.userId": 1 });
postCommentSchema.index({ isDeleted: 1 });

const PostComment = mongoose.model("PostComment", postCommentSchema);

module.exports = { PostComment };
