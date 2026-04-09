const mongoose = require("mongoose");

const ecAppointmentSchema = new mongoose.Schema(
  {
    termId: { type: mongoose.Schema.Types.ObjectId, ref: "EcTerm", required: true },
    postId: { type: mongoose.Schema.Types.ObjectId, ref: "EcPost", required: true },
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true },
    startsOn: { type: Date, required: true },
    endsOn: { type: Date, default: null },
    source: {
      type: String,
      enum: ["Election", "VacancyFill", "Nomination"],
      default: "Election",
    },
  },
  { timestamps: true }
);

ecAppointmentSchema.index(
  { termId: 1, postId: 1 },
  {
    unique: true,
    partialFilterExpression: { endsOn: null },
  }
);

const EcAppointment = mongoose.model("EcAppointment", ecAppointmentSchema);

module.exports = { EcAppointment };
