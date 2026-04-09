const mongoose = require("mongoose");

const governanceProposalApprovalSchema = new mongoose.Schema(
  {
    role: { type: String, required: true },
    action: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    actedAt: { type: Date, default: null },
    comment: { type: String, default: "" },
  },
  { _id: false }
);

const governanceProposalSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["General", "ConstitutionChange"], default: "General" },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    proposedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["PendingModerator", "PendingChiefPatron", "Approved", "Rejected"],
      default: "PendingModerator",
    },
    approvals: {
      type: [governanceProposalApprovalSchema],
      default: [{ role: "Moderator", action: "Pending" }],
    },
  },
  { timestamps: true }
);

const GovernanceProposal = mongoose.model("GovernanceProposal", governanceProposalSchema);

module.exports = { GovernanceProposal };