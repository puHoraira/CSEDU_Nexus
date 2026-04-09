const { z } = require("zod");

const createEventSchema = z.object({
  title: z.string().trim().min(3),
  description: z.string().optional().default(""),
  eventDate: z.string().min(1),
  venue: z.string().trim().min(2),
  budget: z.coerce.number().min(0).default(0),
});

const volunteerSchema = z.object({
  eventId: z.string().min(10),
  memberId: z.string().min(10),
  role: z.string().optional().default("Volunteer"),
});

const volunteerApplySchema = z.object({
  role: z.string().optional().default("Volunteer"),
  message: z.string().max(1000).optional().default(""),
});

const reviewVolunteerSchema = z.object({
  decision: z.enum(["Approved", "Rejected"]),
  reason: z.string().min(5).max(1000),
});

const createEventPostSchema = z.object({
  content: z.string().trim().min(3).max(2000),
});

const createEventCommentSchema = z.object({
  content: z.string().trim().min(1).max(1200),
});

module.exports = {
  createEventSchema,
  volunteerSchema,
  volunteerApplySchema,
  reviewVolunteerSchema,
  createEventPostSchema,
  createEventCommentSchema,
};
