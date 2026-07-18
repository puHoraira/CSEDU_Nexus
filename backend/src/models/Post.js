const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
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
      maxlength: 5000 
    },
    images: { 
      type: [String], 
      default: [], 
      validate: [
        (v) => v.length <= 10, 
        "Maximum 10 images allowed per post"
      ] 
    },
    isAnnouncement: { 
      type: Boolean, 
      default: false 
    },
    isPinned: { 
      type: Boolean, 
      default: false 
    },
    // User mentions in the post content (for notifications)
    mentions: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      userName: { type: String, trim: true }
    }],
    // Visibility and moderation
    visibility: {
      type: String,
      enum: ["Public", "Members_Only", "Hidden"],
      default: "Public"
    },
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
      totalComments: { type: Number, default: 0 },
      totalShares: { type: Number, default: 0 }
    },
    // Tags for categorization
    tags: [{ 
      type: String, 
      trim: true 
    }],
    // Edit history
    isEdited: { 
      type: Boolean, 
      default: false 
    },
    lastEditedAt: { 
      type: Date 
    },
    editHistory: [{
      editedAt: { type: Date, default: Date.now },
      previousContent: { type: String },
      previousImages: [{ type: String }]
    }]
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for efficient queries
postSchema.index({ createdAt: -1 });
postSchema.index({ authorId: 1, createdAt: -1 });
postSchema.index({ isPinned: -1, createdAt: -1 });
postSchema.index({ isDeleted: 1, visibility: 1, createdAt: -1 });
postSchema.index({ "mentions.userId": 1 });
postSchema.index({ tags: 1 });

// Virtual for engagement rate
postSchema.virtual('engagementRate').get(function() {
  const total = this.stats.totalLikes + this.stats.totalComments + this.stats.totalShares;
  return total;
});

const Post = mongoose.model("Post", postSchema);

module.exports = { Post };
