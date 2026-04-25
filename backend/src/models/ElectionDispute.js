const mongoose = require("mongoose");

const electionDisputeSchema = new mongoose.Schema(
  {
    electionId: { type: mongoose.Schema.Types.ObjectId, ref: "Election", required: true },
    commissionId: { type: mongoose.Schema.Types.ObjectId, ref: "ElectionCommission", required: true },
    
    // Dispute Details
    disputeType: {
      type: String,
      enum: [
        "Candidate_Eligibility", 
        "Voting_Irregularity", 
        "Campaign_Violation", 
        "Result_Challenge", 
        "Process_Violation",
        "Technical_Issue",
        "Other"
      ],
      required: true
    },
    
    title: { type: String, required: true },
    description: { type: String, required: true },
    
    // Parties Involved
    complainant: {
      memberId: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true },
      role: { 
        type: String, 
        enum: ["Candidate", "Voter", "Observer", "Commission_Member", "Other"],
        required: true 
      }
    },
    
    respondent: {
      memberId: { type: mongoose.Schema.Types.ObjectId, ref: "Member" },
      candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "ElectionCandidate" },
      role: { 
        type: String, 
        enum: ["Candidate", "Voter", "Commission", "System", "Other"] 
      }
    },
    
    // Evidence and Documentation
    evidence: [{
      type: { 
        type: String, 
        enum: ["Document", "Image", "Video", "Audio", "Screenshot", "Witness_Statement"],
        required: true 
      },
      title: { type: String, required: true },
      description: { type: String },
      fileUrl: { type: String },
      uploadedAt: { type: Date, default: Date.now },
      uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
    }],
    
    witnessStatements: [{
      witnessId: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true },
      statement: { type: String, required: true },
      submittedAt: { type: Date, default: Date.now },
      verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      verifiedAt: { type: Date }
    }],
    
    // Status and Processing
    status: {
      type: String,
      enum: [
        "Submitted", 
        "Under_Review", 
        "Investigation", 
        "Hearing_Scheduled", 
        "Resolved", 
        "Dismissed", 
        "Appealed"
      ],
      default: "Submitted"
    },
    
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium"
    },
    
    // Timeline
    submittedAt: { type: Date, default: Date.now },
    reviewStartedAt: { type: Date },
    hearingScheduledAt: { type: Date },
    resolvedAt: { type: Date },
    
    // Assignment and Review
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    assignedAt: { type: Date },
    
    reviewers: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      role: { 
        type: String, 
        enum: ["Primary_Reviewer", "Secondary_Reviewer", "Observer"],
        default: "Primary_Reviewer" 
      },
      assignedAt: { type: Date, default: Date.now }
    }],
    
    // Investigation and Hearing
    investigationNotes: [{
      note: { type: String, required: true },
      addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      addedAt: { type: Date, default: Date.now },
      isPublic: { type: Boolean, default: false }
    }],
    
    hearingDetails: {
      scheduledAt: { type: Date },
      venue: { type: String },
      attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      minutes: { type: String },
      conductedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
    },
    
    // Resolution
    resolution: {
      decision: {
        type: String,
        enum: [
          "Complaint_Upheld", 
          "Complaint_Dismissed", 
          "Partial_Uphold", 
          "Referred_Higher_Authority",
          "Settlement_Reached"
        ]
      },
      
      reasoning: { type: String },
      
      actions: [{
        actionType: {
          type: String,
          enum: [
            "Candidate_Disqualification",
            "Vote_Recount",
            "Revote_Ordered",
            "Warning_Issued",
            "Fine_Imposed",
            "Process_Change",
            "No_Action",
            "Other"
          ]
        },
        description: { type: String },
        implementedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        implementedAt: { type: Date },
        status: { 
          type: String, 
          enum: ["Pending", "In_Progress", "Completed", "Failed"],
          default: "Pending" 
        }
      }],
      
      decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      decidedAt: { type: Date },
      
      // Voting record if decided by commission
      commissionVoting: [{
        commissioner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        vote: { type: String, enum: ["Uphold", "Dismiss", "Abstain"] },
        reasoning: { type: String }
      }]
    },
    
    // Appeal Process
    appealDetails: {
      appealedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      appealedAt: { type: Date },
      appealReason: { type: String },
      appealStatus: { 
        type: String, 
        enum: ["Not_Appealed", "Appeal_Submitted", "Under_Appeal_Review", "Appeal_Resolved"],
        default: "Not_Appealed" 
      },
      appealDecision: { type: String },
      appealDecidedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      appealDecidedAt: { type: Date }
    },
    
    // Communication
    communications: [{
      from: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      to: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      subject: { type: String, required: true },
      message: { type: String, required: true },
      sentAt: { type: Date, default: Date.now },
      isInternal: { type: Boolean, default: false }
    }],
    
    // Audit and Transparency
    isPublic: { type: Boolean, default: false },
    publicSummary: { type: String },
    
    // System Information
    submissionSource: { 
      type: String, 
      enum: ["Web_Portal", "Mobile_App", "Email", "Physical_Form", "Phone"],
      default: "Web_Portal" 
    },
    ipAddress: { type: String },
    userAgent: { type: String }
  },
  { timestamps: true }
);

// Indexes
electionDisputeSchema.index({ electionId: 1, status: 1 });
electionDisputeSchema.index({ commissionId: 1 });
electionDisputeSchema.index({ "complainant.memberId": 1 });
electionDisputeSchema.index({ disputeType: 1, status: 1 });
electionDisputeSchema.index({ priority: 1, status: 1 });
electionDisputeSchema.index({ submittedAt: 1 });

const ElectionDispute = mongoose.model("ElectionDispute", electionDisputeSchema);

module.exports = { ElectionDispute };