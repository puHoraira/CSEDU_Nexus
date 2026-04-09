const mongoose = require("mongoose");

const electionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    termId: { type: mongoose.Schema.Types.ObjectId, ref: "EcTerm", required: true },
    phase: { type: Number, enum: [1, 2], required: true },
    startsOn: { type: Date, required: true },
    endsOn: { type: Date, required: true },
    status: { type: String, enum: ["Draft", "Active", "Closed"], default: "Draft" },
    resultsPublishedAt: { type: Date, default: null },
    resultsPublishedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

const Election = mongoose.model("Election", electionSchema);

module.exports = { Election };
