const { ApiError } = require("../core/ApiError");
const { ApiResponse } = require("../core/ApiResponse");
const { asyncHandler } = require("../core/asyncHandler");
const { Member } = require("../models/Member");
const { UploadService } = require("../services/UploadService");
const { VideoRecordingService } = require("../services/VideoRecordingService");

class VideoRecordingController {
  /**
   * POST /api/v1/elections/recordings/upload
   *
   * Accepts a multipart/form-data request with a `video` file plus `electionId`
   * and `voterId` body fields. Uploads the video to Cloudinary via UploadService,
   * then persists the metadata via VideoRecordingService.
   *
   * Ownership check: the `voterId` in the request body must match the _id of the
   * Member record that belongs to the authenticated user (req.auth.userId).
   *
   * Returns 201 { videoRecordingId } on success.
   */
  static upload = asyncHandler(async (req, res) => {
    // Multer populates req.file when a `video` field is present
    if (!req.file) {
      throw new ApiError(400, "No video file uploaded");
    }

    const { electionId, voterId } = req.body;

    // Resolve the authenticated user's Member record to enforce ownership
    const member = await Member.findOne({ userId: req.auth.userId }).select("_id");
    if (!member) {
      throw new ApiError(403, "No member record found for the authenticated user");
    }

    if (member._id.toString() !== voterId) {
      throw new ApiError(403, "You can only upload recordings for your own account");
    }

    // Upload to Cloudinary (returns { public_id, secure_url, duration, bytes })
    const cloudinaryResult = await UploadService.uploadToCloudinary(
      req.file.buffer,
      req.file.mimetype,
      electionId,
      voterId
    );

    // Persist metadata in MongoDB (rolls back Cloudinary asset on failure)
    const recording = await VideoRecordingService.createRecording({
      voterId,
      electionId,
      cloudinaryResult,
    });

    return ApiResponse.created(
      res,
      { videoRecordingId: recording._id },
      "Recording uploaded"
    );
  });

  /**
   * GET /api/v1/elections/recordings/:electionId
   *
   * Admin endpoint — lists all VoteRecording documents for the given election,
   * with voter details populated.
   *
   * Requires `election.recording.read` permission (enforced in the router).
   */
  static listByElection = asyncHandler(async (req, res) => {
    const rows = await VideoRecordingService.listByElection(req.params.electionId);
    return ApiResponse.ok(res, rows, "Election recordings");
  });
}

module.exports = { VideoRecordingController };
