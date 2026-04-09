const mongoose = require("mongoose");

const ecTermSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    startsOn: { type: Date, required: true },
    endsOn: { type: Date, required: true },
    status: { type: String, enum: ["Draft", "Active", "Closed"], default: "Draft" },
  },
  { timestamps: true }
);

const EcTerm = mongoose.model("EcTerm", ecTermSchema);

module.exports = { EcTerm };
