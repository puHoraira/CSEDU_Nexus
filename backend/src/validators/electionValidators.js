const { z } = require("zod");

const createElectionSchema = z.object({
  name: z.string().min(3),
  termId: z.string().min(10),
  phase: z.union([z.literal(1), z.literal(2)]),
  electionType: z.enum(["full", "phase2_only", "single_post"]).default("full"),
  targetPost: z.string().min(10).optional().nullable(),
  startsOn: z.string().datetime(),
  endsOn: z.string().datetime(),
}).refine((data) => new Date(data.endsOn).getTime() > new Date(data.startsOn).getTime(), {
  message: "endsOn must be later than startsOn",
  path: ["endsOn"],
}).refine((data) => {
  if (data.electionType === "single_post" && !data.targetPost) return false;
  return true;
}, {
  message: "targetPost is required for single_post election type",
  path: ["targetPost"],
});

const addCandidateSchema = z.object({
  electionId: z.string().min(10),
  memberId: z.string().min(10),
  postId: z.preprocess(
    (val) => (val === '' || val === null || val === undefined) ? null : val,
    z.string().min(10).nullable()
  ),
  memberEcYears: z.number().int().min(0).default(0),
});

const castVoteSchema = z.object({
  electionId: z.string().min(10),
  candidateId: z.string().min(10),
  voterMemberId: z.string().min(10).optional(),
  videoRecordingId: z.preprocess(
    (val) => (val === null || val === undefined) ? undefined : val,
    z.string().min(10).optional()
  ),
});

const updateElectionPhaseSchema = z.object({
  phase: z.union([z.literal(1), z.literal(2)]).optional(),
  status: z.enum([
    "Draft", 
    "Setup", 
    "Phase1_Active", 
    "Phase1_Completed", 
    "Phase2_Active", 
    "Phase2_Completed", 
    "Completed", 
    "Cancelled",
    // Legacy simple statuses (mapped by backend to phase-specific statuses)
    "Active",
    "Closed"
  ]).optional(),
});

const validateCandidateSchema = z.object({
  action: z.enum(["Approved", "Rejected"]),
  reason: z.string().optional().default(""),
});

const cancelCandidateSchema = z.object({
  reason: z.string().min(3),
});

const selfNominateSchema = z.object({
  postId: z.string().min(10).optional().nullable(),
}).optional();

module.exports = {
  createElectionSchema,
  addCandidateSchema,
  castVoteSchema,
  updateElectionPhaseSchema,
  validateCandidateSchema,
  cancelCandidateSchema,
  selfNominateSchema,
};
