const mongoose = require("mongoose");

const constitutionArticleSchema = new mongoose.Schema(
  {
    articleNo: { type: String, trim: true, default: "" },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    imageUrl: { type: String, trim: true, default: "" },
    order: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const constitutionDocumentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    logoImageUrl: { type: String, trim: true, default: "" },
    preamble: { type: String, default: "" },
    content: { type: String, default: "" },
    articles: { type: [constitutionArticleSchema], default: [] },
    version: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ["Active", "Archived"], default: "Active" },
    changeNote: { type: String, default: "" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

constitutionDocumentSchema.index({ version: -1 });

const ConstitutionDocument = mongoose.model("ConstitutionDocument", constitutionDocumentSchema);

module.exports = { ConstitutionDocument };
