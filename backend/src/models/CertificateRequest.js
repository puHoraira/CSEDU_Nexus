const mongoose = require("mongoose");

const ecPostHistorySchema = new mongoose.Schema(
  {
    year: { type: Number, required: true },
    ecTermId: { type: mongoose.Schema.Types.ObjectId, ref: "EcTerm", default: null },
    postTitle: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, default: null },
  },
  { _id: false }
);

const volunteerContributionSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", default: null },
    eventTitle: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    description: { type: String, default: "", trim: true },
  },
  { _id: false }
);

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
    signatureImage: { type: String, default: "" }, // URL to uploaded signature image
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
    ecPostHistory: { type: [ecPostHistorySchema], default: [] },
    volunteerContributions: { type: [volunteerContributionSchema], default: [] },
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
