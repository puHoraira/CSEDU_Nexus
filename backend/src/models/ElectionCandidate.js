const mongoose = require("mongoose");

const electionCandidateSchema = new mongoose.Schema(
  {
    electionId: { type: mongoose.Schema.Types.ObjectId, ref: "Election", required: true },
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true },
    postId: { type: mongoose.Schema.Types.ObjectId, ref: "EcPost", default: null },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    rejectionReason: { type: String, default: "" },
  },
  { timestamps: true }
);

electionCandidateSchema.index({ electionId: 1, memberId: 1, postId: 1 }, { unique: true });

const ElectionCandidate = mongoose.model("ElectionCandidate", electionCandidateSchema);

module.exports = { ElectionCandidate };
