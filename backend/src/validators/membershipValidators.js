const { z } = require("zod");

const createCancellationSchema = z.object({
  memberId: z.string().min(10),
  reason: z.string().min(5),
});

const reviewCancellationSchema = z.object({
  action: z.enum(["Approved", "Rejected"]),
  comment: z.string().optional().default(""),
});

const directCancelMembershipSchema = z.object({
  reason: z.string().min(5),
});

module.exports = { createCancellationSchema, reviewCancellationSchema, directCancelMembershipSchema };
