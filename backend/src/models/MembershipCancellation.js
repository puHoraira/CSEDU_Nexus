const mongoose = require("mongoose");

const approvalStepSchema = new mongoose.Schema(
  {
    role: { type: String, required: true },
    action: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    actedAt: { type: Date, default: null },
    comment: { type: String, default: "" },
  },
  { _id: false }
);

const membershipCancellationSchema = new mongoose.Schema(
  {
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ["Draft", "InReview", "Approved", "Rejected", "Executed"],
      default: "InReview",
    },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    approvals: {
      type: [approvalStepSchema],
      default: [
        { role: "President", action: "Pending" },
        { role: "Moderator", action: "Pending" },
        { role: "Chief Patron", action: "Pending" },
      ],
    },
    executedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const MembershipCancellation = mongoose.model("MembershipCancellation", membershipCancellationSchema);

module.exports = { MembershipCancellation };
