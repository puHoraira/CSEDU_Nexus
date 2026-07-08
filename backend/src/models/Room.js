const mongoose = require('mongoose');

const seatSchema = new mongoose.Schema({
  seatNumber: { type: String, required: true }, // e.g., "A1", "B3"
  row: { type: Number, required: true },
  position: { type: Number, required: true }, // Position in row
  hasDesktop: { type: Boolean, default: true },
  isAccessible: { type: Boolean, default: false }, // For wheelchair access
  status: {
    type: String,
    enum: ['Available', 'Occupied', 'Reserved', 'Blocked'],
    default: 'Available'
  },
  // Current assignment (if occupied)
  assignedTo: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    registrationId: { type: mongoose.Schema.Types.ObjectId, ref: 'EventRegistration' },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
    workshopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workshop' },
    assignedAt: { type: Date }
  },
  notes: { type: String, default: '' }
}, { _id: false });

const roomSchema = new mongoose.Schema({
  // Basic Information
  roomNumber: { type: String, required: true, unique: true, trim: true }, // e.g., "301", "Lab-2", "Auditorium"
  roomName: { type: String, required: true, trim: true }, // e.g., "Computer Lab 1", "Main Auditorium"
  building: { type: String, required: true, trim: true, default: 'CSEDU Building' },
  floor: { type: Number, required: true },

  // Room Type
  roomType: {
    type: String,
    enum: ['Lab', 'Classroom', 'Auditorium', 'Seminar_Hall', 'Other'],
    default: 'Classroom',
    required: true
  },

  // Capacity & Layout
  totalCapacity: { type: Number, required: true, min: 1 },
  seatsPerRow: { type: Number, min: 1 }, // Only for Lab/Classroom with seat assignments
  totalRows: { type: Number, min: 1 }, // Only for Lab/Classroom with seat assignments

  // Seat Management Mode
  seatManagementMode: {
    type: String,
    enum: ['Individual', 'Capacity_Only'], // Individual = assign specific seats, Capacity_Only = just count
    default: 'Individual',
    required: true
  },

  // Seat Configuration (only for Individual mode)
  seats: [seatSchema],

  // Room Features
  features: {
    hasProjector: { type: Boolean, default: false },
    hasWhiteboard: { type: Boolean, default: false },
    hasAC: { type: Boolean, default: false },
    hasWifi: { type: Boolean, default: true },
    hasDesktops: { type: Boolean, default: true },
    hasSoundSystem: { type: Boolean, default: false },
    isAccessible: { type: Boolean, default: false }
  },

  // Availability
  isActive: { type: Boolean, default: true },
  isAvailableForBooking: { type: Boolean, default: true },

  // Usage tracking
  currentUsage: {
    isOccupied: { type: Boolean, default: false },
    occupiedBy: { type: String }, // Event/Workshop title
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
    workshopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workshop' },
    occupiedSeats: { type: Number, default: 0 }, // For Individual mode: actual seats occupied
    registeredCount: { type: Number, default: 0 }, // For Capacity_Only mode: total registrations
    startTime: { type: Date },
    endTime: { type: Date }
  },

  // Metadata
  description: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  mapUrl: { type: String, default: '' },
  notes: { type: String, default: '' },

  // Management
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Indexes
roomSchema.index({ roomNumber: 1 });
roomSchema.index({ building: 1, floor: 1 });
roomSchema.index({ 'currentUsage.isOccupied': 1 });
roomSchema.index({ isActive: 1, isAvailableForBooking: 1 });

// Generate seats automatically (only for Individual mode)
roomSchema.methods.generateSeats = function() {
  if (this.seatManagementMode !== 'Individual') {
    throw new Error('Seat generation is only for Individual seat management mode');
  }
  
  if (!this.seatsPerRow || !this.totalRows) {
    throw new Error('seatsPerRow and totalRows are required for seat generation');
  }
  
  const seats = [];
  const rows = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  
  for (let row = 0; row < this.totalRows; row++) {
    for (let pos = 0; pos < this.seatsPerRow; pos++) {
      const rowLetter = rows[row];
      const seatNumber = `${rowLetter}${pos + 1}`;
      
      seats.push({
        seatNumber,
        row: row + 1,
        position: pos + 1,
        hasDesktop: this.features.hasDesktops,
        status: 'Available'
      });
    }
  }
  
  this.seats = seats;
  this.totalCapacity = seats.length;
  return seats;
};

// Get available capacity (works for both modes)
roomSchema.methods.getAvailableCapacity = function() {
  if (this.seatManagementMode === 'Individual') {
    return this.seats.filter(seat => seat.status === 'Available').length;
  } else {
    // Capacity_Only mode
    return this.totalCapacity - this.currentUsage.registeredCount;
  }
};

// Assign seat/capacity to user
roomSchema.methods.assignSeat = async function(userId, registrationId, eventId, workshopId) {
  if (this.seatManagementMode === 'Individual') {
    // Find first available seat
    const availableSeat = this.seats.find(seat => seat.status === 'Available');
    
    if (!availableSeat) {
      throw new Error('No available seats in this room');
    }
    
    // Assign seat
    availableSeat.status = 'Occupied';
    availableSeat.assignedTo = {
      userId,
      registrationId,
      eventId,
      workshopId,
      assignedAt: new Date()
    };
    
    // Update room usage
    this.currentUsage.occupiedSeats = this.seats.filter(s => s.status === 'Occupied').length;
    
    await this.save();
    
    return availableSeat;
  } else {
    // Capacity_Only mode - just increment counter
    if (this.currentUsage.registeredCount >= this.totalCapacity) {
      throw new Error('Room is at full capacity');
    }
    
    this.currentUsage.registeredCount += 1;
    
    await this.save();
    
    return {
      roomId: this._id,
      roomName: this.roomName,
      mode: 'Capacity_Only',
      registeredCount: this.currentUsage.registeredCount,
      totalCapacity: this.totalCapacity
    };
  }
};

// Release seat/capacity
roomSchema.methods.releaseSeat = async function(seatNumber, registrationId) {
  if (this.seatManagementMode === 'Individual') {
    const seat = this.seats.find(s => s.seatNumber === seatNumber);
    
    if (!seat) {
      throw new Error('Seat not found');
    }
    
    seat.status = 'Available';
    seat.assignedTo = {};
    
    this.currentUsage.occupiedSeats = this.seats.filter(s => s.status === 'Occupied').length;
  } else {
    // Capacity_Only mode - just decrement counter
    if (this.currentUsage.registeredCount > 0) {
      this.currentUsage.registeredCount -= 1;
    }
  }
  
  await this.save();
  
  return true;
};

// Release all seats/capacity for an event/workshop
roomSchema.methods.releaseAllSeatsForEvent = async function(eventId, workshopId) {
  if (this.seatManagementMode === 'Individual') {
    this.seats.forEach(seat => {
      if (seat.assignedTo && 
          (seat.assignedTo.eventId?.toString() === eventId?.toString() ||
           seat.assignedTo.workshopId?.toString() === workshopId?.toString())) {
        seat.status = 'Available';
        seat.assignedTo = {};
      }
    });
    
    this.currentUsage.occupiedSeats = this.seats.filter(s => s.status === 'Occupied').length;
  } else {
    // Capacity_Only mode - reset counter if this is the current event
    if (this.currentUsage.eventId?.toString() === eventId?.toString() ||
        this.currentUsage.workshopId?.toString() === workshopId?.toString()) {
      this.currentUsage.registeredCount = 0;
    }
  }
  
  await this.save();
};

// Get seat map for visualization (only for Individual mode)
roomSchema.methods.getSeatMap = function() {
  if (this.seatManagementMode !== 'Individual') {
    return {
      mode: 'Capacity_Only',
      totalCapacity: this.totalCapacity,
      registered: this.currentUsage.registeredCount,
      available: this.totalCapacity - this.currentUsage.registeredCount
    };
  }
  
  const map = [];
  
  for (let row = 1; row <= this.totalRows; row++) {
    const rowSeats = this.seats.filter(s => s.row === row);
    map.push(rowSeats);
  }
  
  return {
    mode: 'Individual',
    rows: map,
    totalCapacity: this.totalCapacity,
    occupied: this.currentUsage.occupiedSeats,
    available: this.getAvailableCapacity()
  };
};

const Room = mongoose.model('Room', roomSchema);

module.exports = { Room };
