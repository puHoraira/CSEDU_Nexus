const mongoose = require("mongoose");

const eventRegistrationSchema = new mongoose.Schema(
  {
    eventId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Event", 
      required: true, 
      index: true 
    },
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    memberId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Member" 
    },
    
    // Registration Details
    registrationNumber: { 
      type: String, 
      unique: true, 
      required: true 
    },
    status: {
      type: String,
      enum: ["Pending", "Confirmed", "Waitlisted", "Cancelled", "Attended"],
      default: "Pending"
    },
    
    // Seat Assignment
    seatAssignment: {
      roomId: { type: mongoose.Schema.Types.ObjectId, ref: "Room" },
      seatNumber: { type: String }, // e.g., "A1", "B3"
      row: { type: Number },
      position: { type: Number },
      assignedAt: { type: Date },
      autoAssigned: { type: Boolean, default: true }
    },
    
    // Payment Information
    paymentRequired: { type: Boolean, default: false },
    paymentStatus: {
      type: String,
      enum: ["Not_Required", "Pending", "Completed", "Failed", "Refunded"],
      default: "Not_Required"
    },
    paymentAmount: { type: Number, default: 0 },
    paymentMethod: {
      type: String,
      enum: ["bKash", "Nagad", "Rocket", "SSLCommerz", "Stripe", "Cash", "Free"],
      default: "Free"
    },
    paymentTransactionId: { type: String, default: "" },
    paymentGatewayResponse: { type: mongoose.Schema.Types.Mixed },
    paymentDate: { type: Date },
    
    // Additional Information
    attendeeInfo: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
      organization: { type: String, default: "" },
      designation: { type: String, default: "" },
      specialRequirements: { type: String, default: "" }
    },
    
    // Attendance Tracking
    checkInTime: { type: Date },
    checkOutTime: { type: Date },
    attendanceMarked: { type: Boolean, default: false },
    
    // Metadata
    registeredBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User" 
    },
    cancelledAt: { type: Date },
    cancellationReason: { type: String, default: "" },
    notes: { type: String, default: "" }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Compound index for unique registration per user per event
eventRegistrationSchema.index({ eventId: 1, userId: 1 }, { unique: true });
eventRegistrationSchema.index({ registrationNumber: 1 }, { unique: true });
eventRegistrationSchema.index({ paymentTransactionId: 1 });
eventRegistrationSchema.index({ status: 1 });
eventRegistrationSchema.index({ paymentStatus: 1 });

// Generate registration number
eventRegistrationSchema.statics.generateRegistrationNumber = async function(eventId) {
  const count = await this.countDocuments({ eventId });
  const eventCode = eventId.toString().slice(-6).toUpperCase();
  const regNumber = `REG-${eventCode}-${String(count + 1).padStart(4, '0')}`;
  return regNumber;
};

// Virtual for payment pending
eventRegistrationSchema.virtual('isPaymentPending').get(function() {
  return this.paymentRequired && this.paymentStatus === 'Pending';
});

// Virtual for can attend
eventRegistrationSchema.virtual('canAttend').get(function() {
  if (!this.paymentRequired) return this.status === 'Confirmed';
  return this.status === 'Confirmed' && this.paymentStatus === 'Completed';
});

const EventRegistration = mongoose.model("EventRegistration", eventRegistrationSchema);

module.exports = { EventRegistration };
