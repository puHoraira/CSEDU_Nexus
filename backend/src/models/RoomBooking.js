const mongoose = require("mongoose");

/**
 * RoomBooking — a time-bound reservation of a room.
 * -------------------------------------------------------------------------
 * This is the real booking ledger. A room may hold many bookings over time,
 * but NO TWO active bookings for the same room may overlap in time. Events and
 * workshops create a booking when they reserve a room for their time window;
 * the RoomBookingService rejects any overlapping reservation.
 * -------------------------------------------------------------------------
 */
const roomBookingSchema = new mongoose.Schema(
  {
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true, index: true },

    // Time window this room is reserved for.
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },

    // What this booking is for (exactly one of event/workshop, or manual).
    bookedForType: { type: String, enum: ["Event", "Workshop", "Manual"], required: true },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", default: null },
    workshopId: { type: mongoose.Schema.Types.ObjectId, ref: "Workshop", default: null },

    title: { type: String, default: "" },     // denormalized for schedule display
    bookedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    status: {
      type: String,
      enum: ["Active", "Cancelled"],
      default: "Active",
    },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

// Query overlaps fast: same room, active, time range.
roomBookingSchema.index({ roomId: 1, status: 1, startTime: 1, endTime: 1 });
roomBookingSchema.index({ eventId: 1 });
roomBookingSchema.index({ workshopId: 1 });

const RoomBooking = mongoose.model("RoomBooking", roomBookingSchema);

module.exports = { RoomBooking };
