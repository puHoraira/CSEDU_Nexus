const mongoose = require("mongoose");

const eventGallerySchema = new mongoose.Schema(
  {
    // Event Reference
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    
    // Album Information
    albumName: { type: String, default: "Event Photos", trim: true },
    albumDescription: { type: String, default: "", trim: true },
    
    // Photo Details
    photoUrl: { type: String, required: true, trim: true },
    thumbnailUrl: { type: String, default: "", trim: true },
    caption: { type: String, default: "", trim: true },
    
    // Photo Metadata
    fileSize: { type: Number, default: 0 }, // in bytes
    dimensions: {
      width: { type: Number, default: 0 },
      height: { type: Number, default: 0 }
    },
    format: { type: String, default: "", trim: true }, // jpg, png, etc.
    
    // Categorization
    category: {
      type: String,
      enum: ["Event_Setup", "Speakers", "Participants", "Activities", "Awards", "Group_Photos", "Candid", "Other"],
      default: "Other"
    },
    tags: [{ type: String, trim: true }],
    
    // People Tagged
    taggedPeople: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      name: { type: String, trim: true },
      position: {
        x: { type: Number, min: 0, max: 100 }, // Percentage
        y: { type: Number, min: 0, max: 100 }
      }
    }],
    
    // Visibility & Status
    isPublic: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Hidden"],
      default: "Approved"
    },
    
    // Engagement
    likes: { type: Number, default: 0 },
    likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    views: { type: Number, default: 0 },
    downloads: { type: Number, default: 0 },
    
    // Upload Information
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    uploadDate: { type: Date, default: Date.now },
    
    // Approval Workflow
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    rejectedAt: { type: Date },
    rejectionReason: { type: String, default: "", trim: true },
    
    // Display Order
    displayOrder: { type: Number, default: 0 }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for efficient queries
eventGallerySchema.index({ eventId: 1, displayOrder: 1 });
eventGallerySchema.index({ eventId: 1, isFeatured: -1, createdAt: -1 });
eventGallerySchema.index({ category: 1 });
eventGallerySchema.index({ tags: 1 });
eventGallerySchema.index({ uploadedBy: 1 });
eventGallerySchema.index({ status: 1 });

// Method to check if user has liked
eventGallerySchema.methods.hasLiked = function(userId) {
  return this.likedBy.some(id => id.toString() === userId.toString());
};

const EventGallery = mongoose.model("EventGallery", eventGallerySchema);

module.exports = { EventGallery };
