const mongoose = require("mongoose");

const voteSchema = new mongoose.Schema(
  {
    electionId: { type: mongoose.Schema.Types.ObjectId, ref: "Election", required: true },
    voterMemberId: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "ElectionCandidate", required: true },
    
    // Vote Details
    phase: { type: Number, enum: [1, 2], required: true },
    postId: { type: mongoose.Schema.Types.ObjectId, ref: "EcPost", default: null }, // for phase 2
    batch: { type: String }, // for phase 1
    
    // Vote Metadata
    voteType: { 
      type: String, 
      enum: ["Regular", "Abstention", "Protest"], 
      default: "Regular" 
    },
    
    // Security and Verification
    voteHash: { type: String, required: true, unique: true }, // cryptographic hash for verification
    voterVerified: { type: Boolean, default: false },
    verificationMethod: { 
      type: String, 
      enum: ["Student_ID", "Biometric", "OTP", "Manual"], 
      default: "Student_ID" 
    },
    
    // Audit Trail
    castAt: { type: Date, default: Date.now },
    ipAddress: { type: String },
    userAgent: { type: String },
    deviceFingerprint: { type: String },
    
    // Vote Validation
    isValid: { type: Boolean, default: true },
    invalidationReason: { type: String, default: "" },
    invalidatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    invalidatedAt: { type: Date },
    
    // Preferential Voting (if implemented)
    preference: { type: Number, default: 1 }, // 1st choice, 2nd choice, etc.
    
    // Commission Oversight
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    reviewStatus: { 
      type: String, 
      enum: ["Not_Reviewed", "Approved", "Flagged", "Disputed"], 
      default: "Not_Reviewed" 
    },
    
    // Dispute Resolution
    disputeRaised: { type: Boolean, default: false },
    disputeDetails: {
      raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      raisedAt: { type: Date },
      reason: { type: String },
      status: { 
        type: String, 
        enum: ["Open", "Under_Investigation", "Resolved", "Dismissed"] 
      },
      resolution: { type: String },
      resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      resolvedAt: { type: Date }
    }
  },
  { timestamps: true }
);

// Compound indexes for performance and integrity
// Phase 2: unique vote per post per voter per election
voteSchema.index({ electionId: 1, voterMemberId: 1, phase: 1, postId: 1 }, { 
  unique: true, 
  partialFilterExpression: { phase: 2, postId: { $ne: null } }
});
// Phase 1: unique vote per candidate per voter per election (allows up to 5 different candidates)
voteSchema.index({ electionId: 1, voterMemberId: 1, candidateId: 1 }, { unique: true });
voteSchema.index({ electionId: 1, candidateId: 1 });
voteSchema.index({ electionId: 1, phase: 1 });
voteSchema.index({ voterMemberId: 1, electionId: 1 });
voteSchema.index({ castAt: 1 });
voteSchema.index({ isValid: 1 });

// Pre-save middleware for vote validation only
voteSchema.pre('save', function(next) {
  // Phase 1 votes should not have postId
  if (this.phase === 1 && this.postId) {
    return next(new Error('Phase 1 votes cannot specify a post'));
  }
  // Phase 2 votes must have postId
  if (this.phase === 2 && !this.postId) {
    return next(new Error('Phase 2 votes must specify a post'));
  }
  next();
});

const Vote = mongoose.model("Vote", voteSchema);

module.exports = { Vote };
