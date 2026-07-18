const mongoose = require("mongoose");

const chatConversationSchema = new mongoose.Schema(
  {
    participants: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User",
      required: true
    }],
    lastMessageId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "ChatMessage"
    },
    lastMessageContent: { 
      type: String,
      trim: true,
      maxlength: 200
    },
    lastMessageAt: { 
      type: Date,
      default: Date.now,
      index: true
    },
    // Unread count per participant
    unreadCount: {
      type: Map,
      of: Number,
      default: {}
    },
    // Typing indicator
    typingUsers: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      startedAt: { type: Date }
    }]
  },
  { 
    timestamps: true 
  }
);

// Ensure participants array has exactly 2 users and is sorted
chatConversationSchema.index({ participants: 1 }, { unique: true });
chatConversationSchema.index({ lastMessageAt: -1 });

// Helper to create conversation ID from two user IDs
chatConversationSchema.statics.getConversationId = function(userId1, userId2) {
  return [userId1.toString(), userId2.toString()].sort();
};

// Pre-save to ensure participants are sorted
chatConversationSchema.pre('save', function(next) {
  if (this.participants.length !== 2) {
    return next(new Error('Conversation must have exactly 2 participants'));
  }
  // Sort participants for consistent querying
  this.participants.sort((a, b) => a.toString().localeCompare(b.toString()));
  next();
});

const ChatConversation = mongoose.model("ChatConversation", chatConversationSchema);

module.exports = { ChatConversation };
