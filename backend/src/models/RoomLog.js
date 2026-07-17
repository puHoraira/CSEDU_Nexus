const mongoose = require("mongoose");

const roomLogSchema = new mongoose.Schema(
  {
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true, index: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "RoomBooking", default: null },

    entityType: { type: String, enum: ["Event", "Workshop", "Manual"], default: null },
    entityId: { type: mongoose.Schema.Types.ObjectId, default: null },

    action: {
      type: String,
      enum: ["BOOKED", "CANCELLED", "EXTENDED", "MODIFIED"],
      required: true,
    },

    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    metadata: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

roomLogSchema.index({ roomId: 1, createdAt: -1 });
roomLogSchema.index({ bookingId: 1 });
roomLogSchema.index({ entityType: 1, entityId: 1 });

const RoomLog = mongoose.model("RoomLog", roomLogSchema);
module.exports = { RoomLog };
