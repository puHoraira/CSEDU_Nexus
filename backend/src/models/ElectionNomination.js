const mongoose = require("mongoose");

const electionNominationSchema = new mongoose.Schema(
  {
    electionId: { type: mongoose.Schema.Types.ObjectId, ref: "Election", required: true },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "ElectionCandidate", required: true },
    nominatorMemberId: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true },
    
    // Nomination Details
    nominationType: { 
      type: String, 
      enum: ["Primary_Nominator", "Secondary_Nominator", "Supporter"], 
      default: "Supporter" 
    },
    
    nominationStatement: { type: String, default: "" },
    
    // Status and Approval
    status: {
      type: String,
      enum: ["Pending", "Approved", "Declined", "Withdrawn"],
      default: "Pending"
    },
    
    approvedAt: { type: Date },
    declinedAt: { type: Date },
    withdrawnAt: { type: Date },
    
    declineReason: { type: String, default: "" },
    withdrawalReason: { type: String, default: "" },
    
    // Verification
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    verifiedAt: { type: Date },
    
    // Audit
    submittedAt: { type: Date, default: Date.now },
    ipAddress: { type: String },
    userAgent: { type: String }
  },
  { timestamps: true }
);

// Indexes
electionNominationSchema.index({ electionId: 1, candidateId: 1, nominatorMemberId: 1 }, { unique: true });
electionNominationSchema.index({ candidateId: 1, status: 1 });
electionNominationSchema.index({ nominatorMemberId: 1 });

const ElectionNomination = mongoose.model("ElectionNomination", electionNominationSchema);

module.exports = { ElectionNomination };