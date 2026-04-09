const mongoose = require("mongoose");

const reviewStepSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    comment: { type: String, default: "" },
    signatureName: { type: String, default: "" },
    signatureTitle: { type: String, default: "" },
    actedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    actedAt: { type: Date, default: null },
  },
  { _id: false }
);

const certificateRequestSchema = new mongoose.Schema(
  {
    requesterUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    requesterMemberId: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true, index: true },
    certificateType: {
      type: String,
      enum: ["MembershipContribution"],
      default: "MembershipContribution",
    },
    purpose: { type: String, required: true, trim: true, maxlength: 500 },
    contributionSummary: { type: String, required: true, trim: true, maxlength: 3000 },
    status: {
      type: String,
      enum: ["PendingModerator", "PendingChairman", "Approved", "Rejected"],
      default: "PendingModerator",
      index: true,
    },
    rejectionReason: { type: String, default: "" },
    moderatorReview: { type: reviewStepSchema, default: () => ({ action: "Pending" }) },
    chairmanReview: { type: reviewStepSchema, default: () => ({ action: "Pending" }) },
    certificateNo: { type: String, default: "", unique: true, sparse: true },
    approvedAt: { type: Date, default: null },
    downloadedCount: { type: Number, default: 0 },
    lastDownloadedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const CertificateRequest = mongoose.model("CertificateRequest", certificateRequestSchema);

module.exports = { CertificateRequest };
