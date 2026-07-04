const mongoose = require("mongoose");

const voteRecordingSchema = new mongoose.Schema(
  {
    // Who voted and in which election
    voterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: true,
    },
    electionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Election",
      required: true,
    },

    // Cloudinary metadata — no binary video data stored here
    cloudinaryPublicId: { type: String, required: true },
    secureUrl: { type: String, required: true }, // always https://
    duration: { type: Number, required: true }, // seconds
    fileSizeBytes: { type: Number, required: true },

    // Backfilled by ElectionService.castVote after the Vote document is saved
    voteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vote",
      default: null,
    },

    uploadedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// One recording per voter per election
voteRecordingSchema.index({ electionId: 1, voterId: 1 }, { unique: true });

// Sparse so multiple null voteId values are allowed (only enforces uniqueness on non-null)
voteRecordingSchema.index({ voteId: 1 }, { sparse: true });

const VoteRecording = mongoose.model("VoteRecording", voteRecordingSchema);

module.exports = { VoteRecording };
