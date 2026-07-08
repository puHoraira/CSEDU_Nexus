const mongoose = require('mongoose');
const crypto   = require('crypto');

const workshopRegistrationSchema = new mongoose.Schema({
  workshopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workshop', required: true },
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User',     required: true },

  // Participant info snapshot
  participantName:  { type: String, required: true },
  participantEmail: { type: String, required: true },
  participantPhone: { type: String },

  // Registration status
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected', 'Waitlisted', 'Attended', 'Cancelled'],
    default: 'Pending',
  },
  rejectionReason: { type: String },

  // Seat Assignment
  seatAssignment: {
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: "Room" },
    seatNumber: { type: String }, // e.g., "A1", "B3"
    row: { type: Number },
    position: { type: Number },
    assignedAt: { type: Date },
    autoAssigned: { type: Boolean, default: true }
  },

  // Payment
  paymentRequired: { type: Boolean, default: false },
  paymentStatus:   { type: String, enum: ['Not_Required', 'Pending', 'Paid', 'Failed', 'Cancelled', 'Refunded'], default: 'Not_Required' },
  paymentAmount:   { type: Number, default: 0 },
  transactionId:   { type: String },
  paymentGateway:  { type: String, enum: ['SSLCommerz', 'bKash', 'Free'], default: 'Free' },
  gatewayPayload:  { type: Object, default: {} },
  paidAt:          { type: Date },

  // QR Code for check-in
  qrToken:    { type: String, unique: true, sparse: true },
  qrCodeData: { type: String }, // base64 QR image
  checkedIn:  { type: Boolean, default: false },
  checkedInAt: { type: Date },
  checkedInBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Notes
  notes: { type: String },
}, { timestamps: true });

// Generate unique QR token on approval
workshopRegistrationSchema.methods.generateQRToken = function () {
  this.qrToken = `WS-${this._id}-${crypto.randomBytes(8).toString('hex')}`;
  return this.qrToken;
};

workshopRegistrationSchema.index({ workshopId: 1, userId: 1 }, { unique: true });
workshopRegistrationSchema.index({ qrToken: 1 });

module.exports = { WorkshopRegistration: mongoose.model('WorkshopRegistration', workshopRegistrationSchema) };
