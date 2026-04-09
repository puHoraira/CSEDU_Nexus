const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["Income", "Expenditure"], required: true },
    amount: { type: Number, required: true, min: 0.01 },
    category: { type: String, required: true },
    reference: { type: String, required: true },
    occurredOn: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    requiresCheque: { type: Boolean, default: false },
    chequeSignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    chequeSignedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const Transaction = mongoose.model("Transaction", transactionSchema);

module.exports = { Transaction };
