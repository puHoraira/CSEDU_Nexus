const { z } = require("zod");

const enhancedElectionValidators = {
  // Election Management
  createElection: z.object({
    name: z.string().trim().min(3).max(200),
    description: z.string().trim().max(1000).optional().default(""),
    termId: z.string().regex(/^[0-9a-fA-F]{24}$/),
    config: z.object({
      eligibility: z.object({
        minCgpa: z.number().min(0).max(4).optional().default(0),
        minAttendance: z.number().int().min(0).max(100).optional().default(0),
        maxDisciplinaryActions: z.number().int().min(0).optional().default(0)
      }).optional().default({}),
      phase1: z.object({
        maxVotesPerVoter: z.number().int().min(1).max(20).optional().default(1),
        eligibleBatches: z.array(z.string()).optional().default([])
      }).optional().default({}),
      phase2: z.object({
        eligibleVoters: z.enum(["All_Members", "EC_Members_Only", "Phase1_Winners"]).optional().default("All_Members")
      }).optional().default({})
    }).optional().default({})
  }),

  updateElection: z.object({
    name: z.string().trim().min(3).max(200).optional(),
    description: z.string().trim().max(1000).optional()
  }),

  electionId: z.object({
    electionId: z.string().regex(/^[0-9a-fA-F]{24}$/)
  }),

  // Election Commission
  createCommission: z.object({
    chiefCommissioner: z.string().regex(/^[0-9a-fA-F]{24}$/),
    commissioners: z.array(z.object({
      userId: z.string().regex(/^[0-9a-fA-F]{24}$/),
      role: z.enum(["Commissioner", "Assistant Commissioner"]).optional().default("Commissioner")
    })).length(2),
    electionConfig: z.object({
      candidateRegistrationDeadline: z.string().datetime(),
      campaignStartDate: z.string().datetime(),
      campaignEndDate: z.string().datetime(),
      phase1Duration: z.number().int().min(1).max(30).optional().default(7),
      phase2Duration: z.number().int().min(1).max(30).optional().default(7),
      maxVotesPhase1: z.number().int().min(1).max(20).optional().default(1),
      minCgpaForCandidacy: z.number().min(0).max(4).optional().default(0),
      minAttendanceForVoting: z.number().int().min(0).max(100).optional().default(0)
    })
  }),

  updateCommissionConfig: z.object({
    phase1Duration: z.number().int().min(1).max(30).optional(),
    phase2Duration: z.number().int().min(1).max(30).optional()
  }),

  // Candidate Management
  submitCandidateApplication: z.object({
    electionId: z.string().regex(/^[0-9a-fA-F]{24}$/),
    memberId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(), // Optional: if provided, add this member as candidate; otherwise use logged-in user
    phase: z.number().int().min(1).max(2),
    postId: z.string().regex(/^[0-9a-fA-F]{24}$/).nullable().optional(),
    batch: z.string().length(4).optional(),
    candidateStatement: z.string().trim().max(2000).optional().default(""),
    campaignSlogan: z.string().trim().max(200).optional().default(""),
    contactInfo: z.object({
      email: z.string().email().optional(),
      phone: z.string().optional()
    }).optional().default({}),
    nominationType: z.enum(["Self_Nomination", "Nominated_By_Others"]).optional().default("Self_Nomination"),
    nominators: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)).optional().default([])
  }),

  updateCandidateApplication: z.object({
    candidateStatement: z.string().trim().max(2000).optional(),
    campaignSlogan: z.string().trim().max(200).optional(),
    contactInfo: z.object({
      email: z.string().email().optional(),
      phone: z.string().optional()
    }).optional()
  }),

  candidateId: z.object({
    candidateId: z.string().regex(/^[0-9a-fA-F]{24}$/)
  }),

  withdrawCandidateApplication: z.object({
    reason: z.string().trim().max(500).optional().default("")
  }),

  reviewCandidateApplication: z.object({
    status: z.enum(["Approved", "Rejected", "Under_Review"]).optional(),
    action: z.enum(["Approved", "Rejected", "Under_Review"]).optional(),
    reason: z.string().trim().max(500).optional().default(""),
    comments: z.string().trim().max(1000).optional().default(""),
    conditions: z.string().trim().max(500).optional().default(""),
    votingRecord: z.array(z.object({
      commissioner: z.string().regex(/^[0-9a-fA-F]{24}$/),
      vote: z.enum(["Approve", "Reject", "Abstain"]),
      reason: z.string().trim().max(200).optional().default("")
    })).optional().default([])
  }).refine(data => data.status || data.action, {
    message: "Either 'status' or 'action' field is required",
    path: ["status"]
  }),

  // Voting System
  castVote: z.object({
    electionId: z.string().regex(/^[0-9a-fA-F]{24}$/),
    candidateId: z.string().regex(/^[0-9a-fA-F]{24}$/),
    phase: z.number().int().min(1).max(2),
    voteType: z.enum(["Regular", "Abstention", "Protest"]).optional().default("Regular"),
    verificationMethod: z.enum(["Student_ID", "Biometric", "OTP", "Manual"]).optional().default("Student_ID"),
    preference: z.number().int().min(1).max(10).optional().default(1)
  }),

  // Election Phase Management
  updateElectionPhase: z.object({
    currentPhase: z.number().int().min(0).max(2).optional(),
    status: z.enum([
      "Draft", "Setup", "Phase1_Active", "Phase1_Completed", 
      "Phase2_Active", "Phase2_Completed", "Completed", "Cancelled"
    ]).optional(),
    phase1: z.object({
      status: z.enum([
        "Not_Started", "Registration_Open", "Campaign_Period", 
        "Voting_Active", "Completed", "Cancelled"
      ]).optional(),
      candidateRegistrationStart: z.string().datetime().optional(),
      candidateRegistrationEnd: z.string().datetime().optional(),
      votingStart: z.string().datetime().optional(),
      votingEnd: z.string().datetime().optional()
    }).optional(),
    phase2: z.object({
      status: z.enum([
        "Not_Started", "Registration_Open", "Campaign_Period", 
        "Voting_Active", "Completed", "Cancelled"
      ]).optional(),
      candidateRegistrationStart: z.string().datetime().optional(),
      candidateRegistrationEnd: z.string().datetime().optional(),
      votingStart: z.string().datetime().optional(),
      votingEnd: z.string().datetime().optional()
    }).optional()
  }),

  // Results
  publishResults: z.object({
    phase: z.number().int().min(1).max(2),
    autoCreateAppointments: z.boolean().optional().default(false)
  }),

  // Announcements
  createAnnouncement: z.object({
    title: z.string().trim().min(5).max(200),
    content: z.string().trim().min(10).max(2000),
    targetAudience: z.enum(["All_Members", "Candidates", "Voters", "EC_Members"]).optional().default("All_Members"),
    isPublic: z.boolean().optional().default(true)
  }),

  // Disputes
  createDispute: z.object({
    electionId: z.string().regex(/^[0-9a-fA-F]{24}$/),
    disputeType: z.enum([
      "Candidate_Eligibility", "Voting_Irregularity", "Campaign_Violation", 
      "Result_Challenge", "Process_Violation", "Technical_Issue", "Other"
    ]),
    title: z.string().trim().min(5).max(200),
    description: z.string().trim().min(20).max(2000),
    complainantRole: z.enum(["Candidate", "Voter", "Observer", "Commission_Member", "Other"]),
    respondent: z.object({
      memberId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
      candidateId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional()
    }).optional().default({}),
    priority: z.enum(["Low", "Medium", "High", "Critical"]).optional().default("Medium")
  }),

  // Query Validators
  listElections: z.object({
    status: z.enum([
      "Draft", "Setup", "Phase1_Active", "Phase1_Completed", 
      "Phase2_Active", "Phase2_Completed", "Completed", "Cancelled"
    ]).optional(),
    termId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    currentPhase: z.number().int().min(0).max(2).optional()
  }),

  listCandidates: z.object({
    phase: z.number().int().min(1).max(2).optional(),
    status: z.enum(["Draft", "Submitted", "Under_Review", "Approved", "Rejected", "Withdrawn"]).optional(),
    postId: z.string().regex(/^[0-9a-fA-F]{24}$/).nullable().optional(),
    batch: z.string().length(4).optional()
  }),

  getResults: z.object({
    phase: z.number().int().min(1).max(2).optional()
  }),

  getDisputes: z.object({
    status: z.enum([
      "Submitted", "Under_Review", "Investigation", "Hearing_Scheduled", 
      "Resolved", "Dismissed", "Appealed"
    ]).optional(),
    disputeType: z.enum([
      "Candidate_Eligibility", "Voting_Irregularity", "Campaign_Violation", 
      "Result_Challenge", "Process_Violation", "Technical_Issue", "Other"
    ]).optional()
  })
};

module.exports = { enhancedElectionValidators };