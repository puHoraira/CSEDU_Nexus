const mongoose = require("mongoose");

const electionCandidateSchema = new mongoose.Schema(
  {
    electionId: { type: mongoose.Schema.Types.ObjectId, ref: "Election", required: true },
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true },
    
    // Phase and Post Information
    phase: { type: Number, enum: [1, 2], required: true },
    postId: { type: mongoose.Schema.Types.ObjectId, ref: "EcPost", default: null }, // null for phase 1
    batch: { type: String }, // for phase 1 candidates
    
    // Nomination Details
    nominationType: { 
      type: String, 
      enum: ["Self_Nomination", "Nominated_By_Others"], 
      default: "Self_Nomination" 
    },
    
    nominators: [{
      memberId: { type: mongoose.Schema.Types.ObjectId, ref: "Member" },
      nominatedAt: { type: Date, default: Date.now },
      approvalStatus: { 
        type: String, 
        enum: ["Pending", "Approved", "Declined"], 
        default: "Pending" 
      }
    }],
    
    // Candidate Information
    candidateStatement: { type: String, default: "" }, // manifesto/statement
    campaignSlogan: { type: String, default: "" },
    contactInfo: {
      email: { type: String },
      phone: { type: String },
      socialMedia: {
        facebook: { type: String, default: "" },
        linkedin: { type: String, default: "" },
        twitter: { type: String, default: "" }
      }
    },
    
    // Eligibility and Verification
    eligibilityChecked: { type: Boolean, default: false },
    eligibilityCheckDate: { type: Date },
    eligibilityCheckedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    
    eligibilityDetails: {
      cgpa: { type: Number },
      attendancePercentage: { type: Number },
      disciplinaryActions: { type: Number, default: 0 },
      isGraduating: { type: Boolean, default: false },
      ecExperience: [{
        termId: { type: mongoose.Schema.Types.ObjectId, ref: "EcTerm" },
        postId: { type: mongoose.Schema.Types.ObjectId, ref: "EcPost" },
        year: { type: String }
      }]
    },
    
    // Application Status
    status: {
      type: String,
      enum: ["Draft", "Submitted", "Under_Review", "Approved", "Rejected", "Withdrawn"],
      default: "Draft",
    },
    
    // Review Process
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    reviewComments: { type: String, default: "" },
    rejectionReason: { type: String, default: "" },
    
    // Commission Decision
    commissionDecision: {
      decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      decidedAt: { type: Date },
      decision: { 
        type: String, 
        enum: ["Approved", "Rejected", "Conditional_Approval"], 
        default: "Approved" 
      },
      conditions: { type: String, default: "" },
      votingRecord: [{
        commissioner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        vote: { type: String, enum: ["Approve", "Reject", "Abstain"] },
        reason: { type: String, default: "" }
      }]
    },
    
    // Campaign Information
    campaignMaterials: [{
      type: { type: String, enum: ["Poster", "Video", "Document", "Social_Media"] },
      title: { type: String },
      url: { type: String },
      uploadedAt: { type: Date, default: Date.now },
      approvedForDisplay: { type: Boolean, default: false }
    }],
    
    // Voting Results (populated after election)
    votingResults: {
      totalVotes: { type: Number, default: 0 },
      votePercentage: { type: Number, default: 0 },
      rank: { type: Number, default: 0 },
      isWinner: { type: Boolean, default: false },
      isRunnerUp: { type: Boolean, default: false }
    },
    
    // Withdrawal
    withdrawnAt: { type: Date },
    withdrawnBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    withdrawalReason: { type: String, default: "" },
    
    // Audit Trail
    submittedAt: { type: Date },
    lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Compound indexes for performance and uniqueness
electionCandidateSchema.index({ electionId: 1, memberId: 1, phase: 1 }, { unique: true });
electionCandidateSchema.index({ electionId: 1, postId: 1 }); // for phase 2
electionCandidateSchema.index({ electionId: 1, batch: 1 }); // for phase 1
electionCandidateSchema.index({ status: 1 });
electionCandidateSchema.index({ phase: 1, status: 1 });

// Validation middleware
electionCandidateSchema.pre('save', function(next) {
  // Phase 1 candidates should not have postId — strip it silently
  if (this.phase === 1 && this.postId) {
    this.postId = null;
  }
  
  // Phase 2 candidates must have postId
  if (this.phase === 2 && !this.postId) {
    return next(new Error('Phase 2 candidates must specify a post'));
  }
  
  // Phase 1 candidates must have batch
  if (this.phase === 1 && !this.batch) {
    return next(new Error('Phase 1 candidates must specify their batch'));
  }
  
  next();
});

const ElectionCandidate = mongoose.model("ElectionCandidate", electionCandidateSchema);

module.exports = { ElectionCandidate };
