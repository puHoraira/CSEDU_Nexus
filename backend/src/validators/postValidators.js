const { z } = require("zod");

// Helper to validate base64 or URL strings
const imageStringSchema = z.string().refine(
  (val) => {
    // Accept data URLs (base64) or regular URLs
    return val.startsWith('data:image/') || val.startsWith('http://') || val.startsWith('https://');
  },
  { message: "Must be a valid image URL or base64 data URL" }
);

const createPostSchema = z.object({
  content: z.string().min(1, "Post content is required").max(5000, "Post content must not exceed 5000 characters").trim(),
  images: z.array(imageStringSchema).max(10, "Maximum 10 images allowed per post").optional().default([]),
  isAnnouncement: z.boolean().optional().default(false),
  tags: z.array(z.string().trim()).max(10).optional().default([]),
  mentions: z.array(
    z.object({
      userId: z.string(),
      userName: z.string()
    })
  ).optional().default([])
});

const updatePostSchema = z.object({
  content: z.string().min(1, "Post content must not be empty").max(5000, "Post content must not exceed 5000 characters").trim().optional(),
  images: z.array(imageStringSchema).max(10, "Maximum 10 images allowed per post").optional(),
  tags: z.array(z.string().trim()).max(10).optional(),
  mentions: z.array(
    z.object({
      userId: z.string(),
      userName: z.string()
    })
  ).optional(),
  isAnnouncement: z.boolean().optional()
}).refine(data => Object.keys(data).length > 0, {
  message: "At least one field must be provided for update"
});

const createCommentSchema = z.object({
  content: z.string().min(1, "Comment content is required").max(2000, "Comment content must not exceed 2000 characters").trim(),
  images: z.array(imageStringSchema).max(4, "Maximum 4 images allowed per comment").optional().default([]),
  parentCommentId: z.string().optional(),
  mentions: z.array(
    z.object({
      userId: z.string(),
      userName: z.string()
    })
  ).optional().default([])
});

const toggleLikeSchema = z.object({
  reactionType: z.enum(["Like", "Love", "Celebrate", "Support", "Insightful"]).optional().default("Like")
});

module.exports = {
  createPostSchema,
  updatePostSchema,
  createCommentSchema,
  toggleLikeSchema
};
