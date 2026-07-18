const { z } = require("zod");

// Helper to validate base64 or URL strings
const imageStringSchema = z.string().refine(
  (val) => {
    // Accept data URLs (base64) or regular URLs
    return val.startsWith('data:image/') || val.startsWith('http://') || val.startsWith('https://');
  },
  { message: "Must be a valid image URL or base64 data URL" }
);

const sendMessageSchema = z.object({
  receiverId: z.string().min(1, "Receiver ID is required"),
  content: z.string().min(1, "Message content is required").max(5000, "Message content must not exceed 5000 characters").trim(),
  images: z.array(imageStringSchema).max(5, "Maximum 5 images allowed per message").optional().default([]),
  replyToMessageId: z.string().optional()
});

const editMessageSchema = z.object({
  content: z.string().min(1, "Message content is required").max(5000, "Message content must not exceed 5000 characters").trim()
});

const setTypingSchema = z.object({
  isTyping: z.boolean()
});

module.exports = {
  sendMessageSchema,
  editMessageSchema,
  setTypingSchema
};
