const express = require("express");
const multer = require("multer");
const { VideoRecordingController } = require("../controllers/VideoRecordingController");
const { authenticate } = require("../middleware/auth");
const { authorize } = require("../middleware/authorize");
const { rateLimiter } = require("../middleware/rateLimiter");
const { validate } = require("../middleware/validate");
const { uploadRecordingSchema } = require("../validators/videoRecordingValidators");
const { ApiError } = require("../core/ApiError");

const ALLOWED_MIME_TYPES = ["video/webm", "video/mp4", "video/quicktime"];

const videoUploadMulter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 83_886_080 }, // 80 MB
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new ApiError(415, "Unsupported video format"));
    }
    cb(null, true);
  },
});

const router = express.Router();

// POST /api/v1/elections/recordings/upload
router.post(
  "/upload",
  authenticate,
  rateLimiter("videoUpload"),
  videoUploadMulter.single("video"),
  validate(uploadRecordingSchema, "body"),
  VideoRecordingController.upload
);

// GET /api/v1/elections/recordings/:electionId  (admin)
router.get(
  "/:electionId",
  authenticate,
  authorize("election.recording.read"),
  VideoRecordingController.listByElection
);

module.exports = { videoRecordingRoutes: router };
