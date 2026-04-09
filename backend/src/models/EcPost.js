const mongoose = require("mongoose");

const ecPostSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true },
    title: { type: String, required: true, unique: true },
    minYear: { type: Number, default: 1, min: 1, max: 5 },
    minEcYears: { type: Number, default: 0, min: 0 },
    displayOrder: { type: Number, default: 999 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const EcPost = mongoose.model("EcPost", ecPostSchema);

module.exports = { EcPost };
