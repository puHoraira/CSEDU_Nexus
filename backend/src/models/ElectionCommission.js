const mongoose = require("mongoose");

const electionCommissionSchema = new mongoose.Schema(
  {
    electionId: { type: mongoose.Schema.Types.ObjectId, ref: "Election", required: true, unique: true },
    termId: { type: mongoose.Schema.Types.ObjectId, ref: "EcTerm", required: true },
    
    // Commission Members (exactly 3 as per constitution)
    chiefCommissioner: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    }, // Always the Moderator
    
    commissioners: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      role: { 
        type: String, 
        enum: ["Commissioner", "Assistant Commissioner"], 
        default: "Commissioner" 
      },
      appointedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      appointedAt: { type: Date, default: Date.now },
      status: { 
        type: String, 
        enum: ["Active", "Resigned", "Removed"], 
        default: "Active" 
      }
    }],
    
    // Commission Status
    status: {
      type: String,
      enum: ["Forming", "Active", "Dissolved"],
      default: "Forming"
    },
    
    formedAt: { type: Date, default: null },
    dissolvedAt: { type: Date, default: null },
    
    // Election Configuration
    electionConfig: {
      phase1Duration: { type: Number, default: 7 }, // days
      phase2Duration: { type: Number, default: 7 }, // days
      candidateRegistrationDeadline: { type: Date, required: true },
      campaignStartDate: { type: Date, required: true },
      campaignEndDate: { type: Date, required: true },
      
      // Voting Rules
      maxVotesPhase1: { type: Number, default: 5 }, // max votes per voter in phase 1
      allowCrossVoting: { type: Boolean, default: false }, // can vote across batches
      
      // Eligibility Rules
      minCgpaForCandidacy: { type: Number, default: 2.5 },
      minAttendanceForVoting: { type: Number, default: 75 }, // percentage
      
      // Results
      resultPublicationDelay: { type: Number, default: 24 }, // hours after voting ends
    },
    
    // Commission Decisions and Actions
    decisions: [{
      title: { type: String, required: true },
      description: { type: String, required: true },
      decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      decidedAt: { type: Date, default: Date.now },
      type: { 
        type: String, 
        enum: ["Candidate_Approval", "Candidate_Rejection", "Rule_Change", "Schedule_Change", "Other"],
        required: true 
      },
      affectedEntity: {
        entityType: { type: String, enum: ["Candidate", "Election", "Schedule", "Rule"] },
        entityId: { type: mongoose.Schema.Types.ObjectId }
      },
      votingRecord: [{
        commissioner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        vote: { type: String, enum: ["Approve", "Reject", "Abstain"] },
        reason: { type: String, default: "" }
      }]
    }],
    
    // Audit and Transparency
    meetingMinutes: [{
      meetingDate: { type: Date, required: true },
      attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      agenda: { type: String, required: true },
      decisions: { type: String, required: true },
      nextMeetingDate: { type: Date },
      recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
    }],
    
    // Communication
    announcements: [{
      title: { type: String, required: true },
      content: { type: String, required: true },
      publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      publishedAt: { type: Date, default: Date.now },
      targetAudience: { 
        type: String, 
        enum: ["All_Members", "Candidates", "Voters", "EC_Members"],
        default: "All_Members" 
      },
      isPublic: { type: Boolean, default: true }
    }]
  },
  { timestamps: true }
);

// Indexes for performance
electionCommissionSchema.index({ electionId: 1 });
electionCommissionSchema.index({ termId: 1 });
electionCommissionSchema.index({ status: 1 });
electionCommissionSchema.index({ "commissioners.userId": 1 });

// Validation: Ensure exactly 3 total commissioners (1 chief + 2 regular)
electionCommissionSchema.pre('save', function(next) {
  if (this.commissioners.length > 2) {
    return next(new Error('Maximum 2 regular commissioners allowed (plus 1 chief commissioner)'));
  }
  next();
});

const ElectionCommission = mongoose.model("ElectionCommission", electionCommissionSchema);

module.exports = { ElectionCommission };