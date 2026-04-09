const mongoose = require("mongoose");

const voteSchema = new mongoose.Schema(
  {
    electionId: { type: mongoose.Schema.Types.ObjectId, ref: "Election", required: true },
    voterMemberId: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "ElectionCandidate", required: true },
  },
  { timestamps: true }
);

voteSchema.index({ electionId: 1, voterMemberId: 1, candidateId: 1 }, { unique: true });

const Vote = mongoose.model("Vote", voteSchema);

module.exports = { Vote };
