const mongoose = require("mongoose");

const electionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    termId: { type: mongoose.Schema.Types.ObjectId, ref: "EcTerm", required: true },
    
    // Election Phases
    currentPhase: { type: Number, enum: [0, 1, 2], default: 0 }, // 0 = Setup, 1 = Phase 1, 2 = Phase 2
    
    // Phase 1: Batch Representatives (Posts 12+)
    phase1: {
      name: { type: String, default: "Batch Representative Election" },
      description: { type: String, default: "Election for Executive Members (Posts 12+)" },
      candidateRegistrationStart: { type: Date },
      candidateRegistrationEnd: { type: Date },
      campaignStart: { type: Date },
      campaignEnd: { type: Date },
      votingStart: { type: Date },
      votingEnd: { type: Date },
      status: { 
        type: String, 
        enum: ["Not_Started", "Registration_Open", "Campaign_Period", "Voting_Active", "Completed", "Cancelled"], 
        default: "Not_Started" 
      },
      resultsPublishedAt: { type: Date, default: null },
      maxVotesPerVoter: { type: Number, default: 5 },
      eligibleBatches: [{ type: String }], // e.g., ["2020", "2021", "2022", "2023"]
    },
    
    // Phase 2: Office Bearers (Posts 1-11)
    phase2: {
      name: { type: String, default: "Office Bearer Election" },
      description: { type: String, default: "Election for Executive Committee Posts 1-11" },
      candidateRegistrationStart: { type: Date },
      candidateRegistrationEnd: { type: Date },
      campaignStart: { type: Date },
      campaignEnd: { type: Date },
      votingStart: { type: Date },
      votingEnd: { type: Date },
      status: { 
        type: String, 
        enum: ["Not_Started", "Registration_Open", "Campaign_Period", "Voting_Active", "Completed", "Cancelled"], 
        default: "Not_Started" 
      },
      resultsPublishedAt: { type: Date, default: null },
      eligibleVoters: { 
        type: String, 
        enum: ["All_Members", "EC_Members_Only", "Phase1_Winners"], 
        default: "All_Members" 
      },
    },
    
    // Overall Election Status
    status: { 
      type: String, 
      enum: ["Draft", "Setup", "Phase1_Active", "Phase1_Completed", "Phase2_Active", "Phase2_Completed", "Completed", "Cancelled"], 
      default: "Draft" 
    },
    
    // Election Configuration
    config: {
      allowSelfNomination: { type: Boolean, default: true },
      requireNominatorApproval: { type: Boolean, default: false },
      minNominatorsRequired: { type: Number, default: 0 },
      maxCandidatesPerPost: { type: Number, default: 10 },
      
      // Eligibility Criteria
      eligibility: {
        minCgpa: { type: Number, default: 2.5 },
        minAttendance: { type: Number, default: 75 }, // percentage
        maxDisciplinaryActions: { type: Number, default: 0 },
        excludeGraduating: { type: Boolean, default: false },
      },
      
      // Voting Rules
      votingMethod: { 
        type: String, 
        enum: ["Simple_Majority", "Preferential", "Approval"], 
        default: "Simple_Majority" 
      },
      allowAbstention: { type: Boolean, default: true },
      requireVoterVerification: { type: Boolean, default: true },
      
      // Results and Transparency
      showLiveResults: { type: Boolean, default: false },
      showVoterTurnout: { type: Boolean, default: true },
      publishDetailedResults: { type: Boolean, default: true },
      allowResultsChallenges: { type: Boolean, default: true },
      challengePeriodHours: { type: Number, default: 48 },
    },
    
    // Commission and Oversight
    commissionId: { type: mongoose.Schema.Types.ObjectId, ref: "ElectionCommission" },
    supervisedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Moderator
    
    // Results and Analytics
    results: {
      phase1Results: [{
        batch: { type: String },
        totalVotes: { type: Number, default: 0 },
        totalVoters: { type: Number, default: 0 },
        winners: [{
          candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "ElectionCandidate" },
          votes: { type: Number },
          percentage: { type: Number }
        }]
      }],
      
      phase2Results: [{
        postId: { type: mongoose.Schema.Types.ObjectId, ref: "EcPost" },
        totalVotes: { type: Number, default: 0 },
        totalVoters: { type: Number, default: 0 },
        winner: {
          candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "ElectionCandidate" },
          votes: { type: Number },
          percentage: { type: Number }
        },
        runnerUp: {
          candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "ElectionCandidate" },
          votes: { type: Number },
          percentage: { type: Number }
        }
      }],
      
      overallStats: {
        totalEligibleVoters: { type: Number, default: 0 },
        totalVotesCast: { type: Number, default: 0 },
        voterTurnoutPercentage: { type: Number, default: 0 },
        totalCandidates: { type: Number, default: 0 },
        totalPosts: { type: Number, default: 0 }
      }
    },
    
    // Audit and Compliance
    auditLog: [{
      action: { type: String, required: true },
      performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      timestamp: { type: Date, default: Date.now },
      details: { type: mongoose.Schema.Types.Mixed },
      ipAddress: { type: String },
      userAgent: { type: String }
    }],
    
    // Final Results Publication
    finalResultsPublishedAt: { type: Date, default: null },
    finalResultsPublishedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    
    // Archive and History
    isArchived: { type: Boolean, default: false },
    archivedAt: { type: Date, default: null },
    archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

// Indexes for performance
electionSchema.index({ termId: 1, status: 1 });
electionSchema.index({ currentPhase: 1, status: 1 });
electionSchema.index({ "phase1.status": 1 });
electionSchema.index({ "phase2.status": 1 });
electionSchema.index({ commissionId: 1 });
electionSchema.index({ supervisedBy: 1 });

const Election = mongoose.model("Election", electionSchema);

module.exports = { Election };
