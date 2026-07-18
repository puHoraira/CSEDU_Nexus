const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
  {
    senderId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true,
      index: true 
    },
    receiverId: { 
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
        (v) => v.length <= 5, 
        "Maximum 5 images allowed per message"
      ] 
    },
    // Message status
    isRead: { 
      type: Boolean, 
      default: false,
      index: true 
    },
    readAt: { 
      type: Date,
      default: null 
    },
    isDeleted: { 
      type: Boolean, 
      default: false 
    },
    deletedBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User",
      default: null
    },
    deletedAt: { 
      type: Date,
      default: null 
    },
    // Edit tracking
    isEdited: { 
      type: Boolean, 
      default: false 
    },
    lastEditedAt: { 
      type: Date 
    },
    // Reply to another message
    replyToMessageId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "ChatMessage",
      default: null
    }
  },
  { 
    timestamps: true 
  }
);

// Indexes for efficient queries
chatMessageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
chatMessageSchema.index({ receiverId: 1, isRead: 1, createdAt: -1 });
chatMessageSchema.index({ senderId: 1, createdAt: -1 });
chatMessageSchema.index({ receiverId: 1, createdAt: -1 });

// Compound index for conversation queries (both directions)
chatMessageSchema.index({ 
  senderId: 1, 
  receiverId: 1, 
  isDeleted: 1, 
  createdAt: -1 
});

const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);

module.exports = { ChatMessage };
