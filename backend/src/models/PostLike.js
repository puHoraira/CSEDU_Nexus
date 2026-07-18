const mongoose = require("mongoose");

const postLikeSchema = new mongoose.Schema(
  {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true,
      index: true 
    },
    postId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Post",
      index: true
    },
    commentId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "PostComment",
      index: true
    },
    // Reaction type (for future expansion to multiple reactions)
    reactionType: {
      type: String,
      enum: ["Like", "Love", "Celebrate", "Support", "Insightful"],
      default: "Like"
    }
  },
  { 
    timestamps: true 
  }
);

// Ensure a user can only like a post or comment once
postLikeSchema.index({ userId: 1, postId: 1 }, { unique: true, sparse: true });
postLikeSchema.index({ userId: 1, commentId: 1 }, { unique: true, sparse: true });

// Compound indexes for efficient queries
postLikeSchema.index({ postId: 1, createdAt: -1 });
postLikeSchema.index({ commentId: 1, createdAt: -1 });
postLikeSchema.index({ userId: 1, createdAt: -1 });

// Validation: must have either postId or commentId, but not both
postLikeSchema.pre('save', function(next) {
  if ((this.postId && this.commentId) || (!this.postId && !this.commentId)) {
    return next(new Error('PostLike must have either postId or commentId, but not both'));
  }
  next();
});

const PostLike = mongoose.model("PostLike", postLikeSchema);

module.exports = { PostLike };
