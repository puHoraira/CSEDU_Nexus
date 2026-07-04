const { z } = require("zod");

/**
 * Zod schema for the video upload endpoint body fields.
 * Note: the actual video file is handled by multer — only the
 * metadata fields are validated here.
 */
const uploadRecordingSchema = z.object({
  electionId: z.string().min(10, "electionId must be a valid ObjectId"),
  voterId: z.string().min(10, "voterId must be a valid ObjectId"),
});

module.exports = { uploadRecordingSchema };
