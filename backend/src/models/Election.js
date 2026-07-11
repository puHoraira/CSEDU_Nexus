const mongoose = require("mongoose");

// A per-batch sub-election within Phase 1. Each batch independently elects
// its representatives (Constitution ARTICLE XIV). Commissioners activate /
// pause / edit each batch; automation tallies + closes on its own deadline.
const phase1BatchSchema = new mongoose.Schema(
  {
    batch: { type: String, required: true }, // e.g. "2022"
    label: { type: String, default: "" },    // display name, e.g. "Batch 2022"
    votingStart: { type: Date, default: null },
    votingEnd: { type: Date, default: null },
    maxVotesPerVoter: { type: Number, default: 5 },
    repSeats: { type: Number, default: 5 },   // how many reps this batch elects
    status: {
      type: String,
      enum: ["Not_Started", "Active", "Paused", "Completed", "Cancelled"],
      default: "Not_Started",
    },
    resultsPublishedAt: { type: Date, default: null },
    winners: [{
      candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "ElectionCandidate" },
      memberId: { type: mongoose.Schema.Types.ObjectId, ref: "Member" },
      votes: { type: Number, default: 0 },
      percentage: { type: Number, default: 0 },
      rank: { type: Number },
      appointed: { type: Boolean, default: false },
    }],
    totalVotes: { type: Number, default: 0 },
    totalVoters: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const electionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    termId: { type: mongoose.Schema.Types.ObjectId, ref: "EcTerm", required: true },
    
    // Target Academic Years (for filtering who can see/vote in this election)
    targetYears: {
      type: [String],
      enum: ["First_Year", "Second_Year", "Third_Year", "Fourth_Year", "Masters", "All_Years"],
      default: ["All_Years"]
    },
    
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

    // Per-batch sub-elections for Phase 1. Each batch is independently
    // activatable/pausable and auto-closes on its own deadline. When ALL
    // batch sub-elections complete, the election auto-advances to Phase1_Completed.
    phase1Batches: { type: [phase1BatchSchema], default: [] },

    // Whether Phase 1 runs as independent per-batch sub-elections (new flow)
    // or a single shared window (legacy). Defaults to per-batch.
    usePerBatchPhase1: { type: Boolean, default: true },
    
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
    
    // Top-level voting window (used for simple elections)
    startsOn: { type: Date, default: null },
    endsOn: { type: Date, default: null },
    
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
