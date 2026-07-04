const { VoteRecording } = require("../models/VoteRecording");
const { UploadService } = require("./UploadService");
const { ApiError } = require("../core/ApiError");

class VideoRecordingService {
  /**
   * Creates a VoteRecording document from a successful Cloudinary upload result.
   * If the MongoDB write fails, rolls back by deleting the Cloudinary asset.
   */
  static async createRecording({ voterId, electionId, cloudinaryResult }) {
    try {
      // Upsert: if a recording already exists for this voter+election (e.g. a
      // retry after a failed vote), replace it so the unique index never fires.
      const recording = await VoteRecording.findOneAndUpdate(
        { electionId, voterId },
        {
          $set: {
            cloudinaryPublicId: cloudinaryResult.public_id,
            secureUrl:          cloudinaryResult.secure_url,
            duration:           cloudinaryResult.duration || 0,
            fileSizeBytes:      cloudinaryResult.bytes,
            voteId:             null,  // reset in case this is a retry
            uploadedAt:         new Date(),
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      return recording;
    } catch (error) {
      // Roll back the Cloudinary upload to avoid orphaned assets
      console.error(
        "[VideoRecordingService] MongoDB write failed after Cloudinary upload — rolling back:",
        cloudinaryResult.public_id,
        error
      );
      await UploadService.deleteRecording(cloudinaryResult.public_id);
      throw new ApiError(500, "Failed to save recording metadata");
    }
  }

  /**
   * Returns a VoteRecording by its _id, or throws 404.
   */
  static async getRecordingById(id) {
    const recording = await VoteRecording.findById(id);
    if (!recording) {
      throw new ApiError(404, "Recording not found");
    }
    return recording;
  }

  /**
   * Returns the VoteRecording for a specific voter + election combination, or null.
   */
  static async getRecordingByElectionAndVoter(electionId, voterId) {
    return VoteRecording.findOne({ electionId, voterId });
  }

  /**
   * Lists all recordings for an election, populating voter info.
   */
  static async listByElection(electionId) {
    return VoteRecording.find({ electionId })
      .populate({
        path: "voterId",
        select: "studentId userId",
        populate: { path: "userId", select: "firstName lastName" },
      })
      .sort({ uploadedAt: -1 })
      .lean();
  }

  /**
   * Backfills the voteId on a VoteRecording after the Vote document is saved.
   * Called by ElectionService.castVote immediately after Vote.create().
   */
  static async backfillVoteId(recordingId, voteId) {
    await VoteRecording.findByIdAndUpdate(recordingId, { voteId });
  }
}

module.exports = { VideoRecordingService };
