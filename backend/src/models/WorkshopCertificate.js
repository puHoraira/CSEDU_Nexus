const mongoose = require("mongoose");

// Auto-issued workshop completion certificate (no approval chain).
const workshopCertificateSchema = new mongoose.Schema(
  {
    workshopId:    { type: mongoose.Schema.Types.ObjectId, ref: "Workshop", required: true, index: true },
    userId:        { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    registrationId:{ type: mongoose.Schema.Types.ObjectId, ref: "WorkshopRegistration" },

    certificateNo: { type: String, required: true, unique: true },
    recipientName: { type: String, required: true },
    workshopTitle: { type: String, required: true },

    completionPercentage: { type: Number, default: 0 },
    issuedAt:      { type: Date, default: Date.now },

    // Cached PDF (base64 data URL) so re-downloads don't re-render.
    pdfData:       { type: String },

    // Public verification code.
    verifyCode:    { type: String, index: true },
  },
  { timestamps: true }
);

workshopCertificateSchema.index({ workshopId: 1, userId: 1 }, { unique: true });

const WorkshopCertificate = mongoose.model("WorkshopCertificate", workshopCertificateSchema);

module.exports = { WorkshopCertificate };
