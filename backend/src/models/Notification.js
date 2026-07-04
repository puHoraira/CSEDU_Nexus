const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipientUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["System", "Meeting", "Membership", "Governance", "Certificate", "Event", "General", "Announcement"],
      default: "System",
    },
    actionUrl: { type: String, default: "", trim: true },
    entityType: { type: String, default: "", trim: true },
    entityId: { type: String, default: "", trim: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
    
    // Enhanced Targeting System
    targetType: {
      type: String,
      enum: ["Individual", "Year_Wise", "General", "Custom_Group"],
      default: "Individual"
    },
    
    // For year-wise notifications
    targetYears: {
      type: [String],
      enum: ["First_Year", "Second_Year", "Third_Year", "Fourth_Year", "Masters", "Graduated", "All_Years"],
      default: []
    },
    
    // For custom group notifications
    targetMembers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member"
    }],
    
    // Priority level
    priority: {
      type: String,
      enum: ["Low", "Normal", "High", "Urgent"],
      default: "Normal"
    },
    
    // Scheduling
    scheduledFor: { type: Date, default: null },
    isSent: { type: Boolean, default: false },
    sentAt: { type: Date, default: null },
    
    // Sender information
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    senderRole: { type: String, trim: true },
    
    // Batch notification tracking
    batchId: { type: String, index: true }, // For grouping bulk notifications
    totalRecipients: { type: Number, default: 1 },
    deliveredCount: { type: Number, default: 0 },
    readCount: { type: Number, default: 0 },
    
    // Expiry
    expiresAt: { type: Date, default: null },
    isExpired: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Indexes for efficient queries
notificationSchema.index({ recipientUserId: 1, createdAt: -1 });
notificationSchema.index({ recipientUserId: 1, isRead: 1 });
notificationSchema.index({ batchId: 1 });
notificationSchema.index({ scheduledFor: 1, isSent: 1 });
notificationSchema.index({ targetType: 1, isSent: 1 });
notificationSchema.index({ expiresAt: 1, isExpired: 1 });

// Method to mark as read
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

// Method to check if expired
notificationSchema.methods.checkExpiry = function() {
  if (this.expiresAt && new Date() > this.expiresAt) {
    this.isExpired = true;
    return this.save();
  }
  return Promise.resolve(this);
};

// Static method to mark multiple as read
notificationSchema.statics.markManyAsRead = async function(notificationIds, userId) {
  return this.updateMany(
    {
      _id: { $in: notificationIds },
      recipientUserId: userId
    },
    {
      isRead: true,
      readAt: new Date()
    }
  );
};

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = { Notification };
