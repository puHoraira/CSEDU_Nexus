const { z } = require("zod");

// Accept hosted URLs and base64 image data URLs (stored in MongoDB).
const imageStringSchema = z
  .string()
  .trim()
  .refine(
    (v) => /^https?:\/\//i.test(v) || /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(v),
    { message: "Image must be a URL or a base64 image data URL" }
  );

const createWorkshopPostSchema = z.object({
  content: z.string().trim().min(3).max(2000),
  images: z.array(imageStringSchema).max(6).optional().default([]),
  isAnnouncement: z.boolean().optional().default(false),
});

const createWorkshopCommentSchema = z.object({
  content: z.string().trim().max(1200).optional().default(""),
  images: z.array(imageStringSchema).max(4).optional().default([]),
}).refine((data) => data.content.length > 0 || data.images.length > 0, {
  message: "Comment must have either content or at least one image",
});

const sessionSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).optional(),
  startTime: z.string().datetime().optional().or(z.literal("")),
  endTime: z.string().datetime().optional().or(z.literal("")),
  location: z.string().trim().max(200).optional(),
  isOnline: z.boolean().optional(),
  speaker: z.string().trim().max(120).optional(),
  order: z.number().int().min(0).optional(),
});

const preworkSchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(2000).optional(),
  url: z.string().trim().max(1000).optional(),
  required: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
});

const assignmentSchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(4000).optional(),
  dueDate: z.string().datetime().optional().or(z.literal("")),
  maxPoints: z.number().min(0).max(1000).optional(),
  allowFile: z.boolean().optional(),
  allowLink: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
});

const submissionSchema = z.object({
  content: z.string().trim().max(4000).optional(),
  fileUrl: z.string().trim().optional(),
  fileName: z.string().trim().max(300).optional(),
  linkUrl: z.string().trim().max(1000).optional(),
});

const gradeSchema = z.object({
  grade: z.number().min(0),
  feedback: z.string().trim().max(2000).optional(),
});

const feedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional(),
  contentRating: z.number().int().min(1).max(5).optional(),
  instructorRating: z.number().int().min(1).max(5).optional(),
  organizationRating: z.number().int().min(1).max(5).optional(),
  wouldRecommend: z.boolean().optional(),
  isAnonymous: z.boolean().optional(),
});

const bulkActionSchema = z.object({
  action: z.enum(["approve", "reject", "waitlist"]),
  registrationIds: z.array(z.string()).min(1),
  reason: z.string().trim().max(1000).optional(),
});

const markAttendanceSchema = z.object({
  userId: z.string(),
  attended: z.boolean(),
});

const bulkAttendanceSchema = z.object({
  entries: z.array(z.object({ userId: z.string(), attended: z.boolean() })).min(1),
});

module.exports = {
  createWorkshopPostSchema,
  createWorkshopCommentSchema,
  sessionSchema,
  preworkSchema,
  assignmentSchema,
  submissionSchema,
  gradeSchema,
  feedbackSchema,
  bulkActionSchema,
  markAttendanceSchema,
  bulkAttendanceSchema,
};
