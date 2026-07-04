const { z } = require("zod");

const createElectionSchema = z.object({
  name: z.string().min(3),
  termId: z.string().min(10),
  phase: z.union([z.literal(1), z.literal(2)]),
  startsOn: z.string().datetime(),
  endsOn: z.string().datetime(),
}).refine((data) => new Date(data.endsOn).getTime() > new Date(data.startsOn).getTime(), {
  message: "endsOn must be later than startsOn",
  path: ["endsOn"],
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
  status: z.enum(["Draft", "Active", "Closed"]).optional(),
});

const validateCandidateSchema = z.object({
  action: z.enum(["Approved", "Rejected"]),
  reason: z.string().optional().default(""),
});

const cancelCandidateSchema = z.object({
  reason: z.string().min(3),
});

module.exports = {
  createElectionSchema,
  addCandidateSchema,
  castVoteSchema,
  updateElectionPhaseSchema,
  validateCandidateSchema,
  cancelCandidateSchema,
};
