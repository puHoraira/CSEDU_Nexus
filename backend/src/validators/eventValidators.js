const { z } = require("zod");

// Accept both hosted image URLs (http/https) and base64 data URLs
// (our upload endpoint returns data:*;base64,... stored in MongoDB).
const imageStringSchema = z
  .string()
  .trim()
  .refine(
    (v) => /^https?:\/\//i.test(v) || /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(v),
    { message: "Image must be a URL or a base64 image data URL" }
  );

const volunteerEligibilitySchema = z.object({
  allowedYears: z.array(z.coerce.number().int().min(1).max(5)).max(5).optional(),
  allowedBatches: z.array(z.coerce.number().int().min(1)).max(30).optional(),
});

const volunteerPositionSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slots: z.coerce.number().int().min(1).max(200),
  description: z.string().trim().max(500).optional().default(""),
  requiredYears: z.array(z.coerce.number().int().min(1).max(5)).max(5).optional().default([]),
  requiredBatches: z.array(z.coerce.number().int().min(1)).max(30).optional().default([]),
});

const volunteerProgramSchema = z.object({
  applicationDeadline: z.string().min(1).optional().nullable(),
  notes: z.string().trim().max(2000).optional().default(""),
  positions: z.array(volunteerPositionSchema).max(10).optional().default([]),
});

const createEventSchema = z.object({
  title: z.string().trim().min(3),
  description: z.string().optional().default(""),
  eventDate: z.string().min(1),
  venue: z.string().trim().min(2),
  budget: z.coerce.number().min(0).default(0),
  volunteerEligibility: volunteerEligibilitySchema.optional().default({ allowedYears: [], allowedBatches: [] }),
  volunteerProgram: volunteerProgramSchema.optional().default({ applicationDeadline: null, notes: "", positions: [] }),
});

const updateEventSchema = z
  .object({
    title: z.string().trim().min(3).optional(),
    description: z.string().optional(),
    eventDate: z.string().min(1).optional(),
    venue: z.string().trim().min(2).optional(),
    budget: z.coerce.number().min(0).optional(),
    status: z.enum(["Planned", "Ongoing", "Completed", "Cancelled"]).optional(),
    volunteerEligibility: volunteerEligibilitySchema.optional(),
    volunteerProgram: volunteerProgramSchema.optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field is required for update",
  });

const volunteerSchema = z.object({
  eventId: z.string().min(10),
  memberId: z.string().min(10),
  role: z.string().optional().default("Volunteer"),
});

const volunteerApplySchema = z.object({
  role: z.string().optional().default("Volunteer"),
  message: z.string().max(1000).optional().default(""),
  preferredPositions: z.array(z.string().trim().min(2).max(80)).max(5).optional().default([]),
  availability: z.string().trim().max(1000).optional().default(""),
});

const reviewVolunteerSchema = z.object({
  decision: z.enum(["Shortlisted", "Waitlisted", "Approved", "Rejected"]),
  reason: z.string().min(5).max(1000),
  assignedPosition: z.string().trim().min(2).max(80).optional().default(""),
});

const createEventPostSchema = z.object({
  content: z.string().trim().min(3).max(2000),
  images: z.array(imageStringSchema).max(6).optional().default([]),
  isAnnouncement: z.boolean().optional().default(false),
});

const createEventCommentSchema = z.object({
  content: z.string().trim().min(1).max(1200),
});

module.exports = {
  createEventSchema,
  updateEventSchema,
  volunteerSchema,
  volunteerApplySchema,
  reviewVolunteerSchema,
  createEventPostSchema,
  createEventCommentSchema,
};
