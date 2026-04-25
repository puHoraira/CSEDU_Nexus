const mongoose = require("mongoose");

const homepageMessageSchema = new mongoose.Schema(
  {
    authorUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    authorName: { type: String, required: true, trim: true, maxlength: 120 },
    authorTitle: { type: String, required: true, trim: true, maxlength: 120 },
    authorDesignation: { type: String, default: "", trim: true, maxlength: 200 },
    authorImageUrl: { type: String, default: "", trim: true },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    displayOrder: { type: Number, default: 0, index: true },
    isActive: { type: Boolean, default: true, index: true },
    isPublished: { type: Boolean, default: false, index: true },
    publishedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    messageType: { 
      type: String, 
      enum: ["Leadership", "Welcome", "Announcement", "Achievement", "General"], 
      default: "General",
      index: true
    },
    backgroundColor: { type: String, default: "", trim: true },
    textColor: { type: String, default: "", trim: true },
    metadata: {
      showOnHomepage: { type: Boolean, default: true },
      showOnDashboard: { type: Boolean, default: false },
      allowComments: { type: Boolean, default: false },
      priority: { type: String, enum: ["Low", "Medium", "High", "Critical"], default: "Medium" }
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    approvedAt: { type: Date, default: null },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    rejectedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: ["Draft", "PendingApproval", "Approved", "Rejected", "Expired"],
      default: "Draft",
      index: true
    }
  },
  { timestamps: true }
);

// Indexes for performance
homepageMessageSchema.index({ isActive: 1, isPublished: 1, displayOrder: 1 });
homepageMessageSchema.index({ status: 1, messageType: 1 });
homepageMessageSchema.index({ expiresAt: 1 }, { sparse: true });

const HomepageMessage = mongoose.model("HomepageMessage", homepageMessageSchema);

module.exports = { HomepageMessage };