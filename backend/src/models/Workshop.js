const mongoose = require('mongoose');

const speakerSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  designation:  { type: String },
  organization: { type: String },
  bio:          { type: String },
  avatarUrl:    { type: String },
}, { _id: false });

const materialSchema = new mongoose.Schema({
  title: { type: String, required: true },
  url:   { type: String, required: true },
  type:  { type: String, enum: ['pdf', 'video', 'link', 'other'], default: 'link' },
}, { _id: false });

const workshopSchema = new mongoose.Schema({
  title:            { type: String, required: true, trim: true },
  description:      { type: String, required: true },
  shortDescription: { type: String },
  coverImage:       { type: String },

  // Schedule
  startDate:        { type: Date, required: true },
  endDate:          { type: Date, required: true },
  venue:            { type: String, required: true },
  isOnline:         { type: Boolean, default: false },
  onlineLink:       { type: String },

  // Category & tags
  category:         { type: String, enum: ['Technical', 'Soft Skills', 'Research', 'Career', 'Creative', 'Other'], default: 'Technical' },
  tags:             [{ type: String }],
  level:            { type: String, enum: ['Beginner', 'Intermediate', 'Advanced', 'All Levels'], default: 'All Levels' },

  // Capacity & registration
  capacity:         { type: Number, required: true, min: 1 },
  registrationDeadline: { type: Date },
  requiresApproval: { type: Boolean, default: false },

  // Payment
  isFree:           { type: Boolean, default: true },
  fee:              { type: Number, default: 0, min: 0 },
  currency:         { type: String, default: 'BDT' },

  // Content
  speakers:         [speakerSchema],
  materials:        [materialSchema],
  prerequisites:    [{ type: String }],
  learningOutcomes: [{ type: String }],

  // Status
  status: {
    type: String,
    enum: ['Draft', 'Published', 'Registration_Open', 'Registration_Closed', 'Ongoing', 'Completed', 'Cancelled'],
    default: 'Draft',
  },

  // Organizer
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Stats (denormalized)
  stats: {
    totalRegistrations: { type: Number, default: 0 },
    totalAttendees:     { type: Number, default: 0 },
    totalApproved:      { type: Number, default: 0 },
  },
}, { timestamps: true });

module.exports = { Workshop: mongoose.model('Workshop', workshopSchema) };
