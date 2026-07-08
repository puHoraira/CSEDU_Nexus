const { Room } = require('../models/Room');
const { ApiError } = require('../core/ApiError');

class RoomService {
  /**
   * Create a new room
   */
  static async createRoom(data, userId) {
    const { 
      roomNumber, 
      roomName, 
      building, 
      floor, 
      roomType, 
      totalCapacity, 
      seatManagementMode,
      seatsPerRow,
      totalRows,
      features,
      description,
      imageUrl
    } = data;

    // Check if room number already exists
    const existingRoom = await Room.findOne({ roomNumber });
    if (existingRoom) {
      throw new ApiError(400, `Room with number ${roomNumber} already exists`);
    }

    // Validate seat management mode
    if (seatManagementMode === 'Individual' && (!seatsPerRow || !totalRows)) {
      throw new ApiError(400, 'seatsPerRow and totalRows are required for Individual seat management mode');
    }

    // Create room
    const room = new Room({
      roomNumber,
      roomName,
      building,
      floor,
      roomType,
      totalCapacity,
      seatManagementMode,
      seatsPerRow: seatManagementMode === 'Individual' ? seatsPerRow : undefined,
      totalRows: seatManagementMode === 'Individual' ? totalRows : undefined,
      features: features || {},
      description: description || '',
      imageUrl: imageUrl || '',
      createdBy: userId,
      isActive: true,
      isAvailableForBooking: true
    });

    // Generate seats if Individual mode
    if (seatManagementMode === 'Individual') {
      room.generateSeats();
    }

    await room.save();

    return room;
  }

  /**
   * Get all rooms with filters
   */
  static async getAllRooms(filters = {}) {
    const query = {};

    if (filters.roomType) {
      query.roomType = filters.roomType;
    }

    if (filters.building) {
      query.building = filters.building;
    }

    if (filters.floor) {
      query.floor = parseInt(filters.floor);
    }

    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive === 'true';
    }

    if (filters.isAvailableForBooking !== undefined) {
      query.isAvailableForBooking = filters.isAvailableForBooking === 'true';
    }

    if (filters.seatManagementMode) {
      query.seatManagementMode = filters.seatManagementMode;
    }

    const rooms = await Room.find(query)
      .populate('createdBy', 'firstName lastName email')
      .populate('lastModifiedBy', 'firstName lastName email')
      .sort({ building: 1, floor: 1, roomNumber: 1 });

    // Add available capacity to each room
    const roomsWithCapacity = rooms.map(room => {
      const roomObj = room.toObject();
      roomObj.availableCapacity = room.getAvailableCapacity();
      return roomObj;
    });

    return roomsWithCapacity;
  }

  /**
   * Get room by ID
   */
  static async getRoomById(roomId) {
    const room = await Room.findById(roomId)
      .populate('createdBy', 'firstName lastName email')
      .populate('lastModifiedBy', 'firstName lastName email')
      .populate('currentUsage.eventId', 'title eventDate')
      .populate('currentUsage.workshopId', 'title startDate');

    if (!room) {
      throw new ApiError(404, 'Room not found');
    }

    const roomObj = room.toObject();
    roomObj.availableCapacity = room.getAvailableCapacity();

    return roomObj;
  }

  /**
   * Update room
   */
  static async updateRoom(roomId, data, userId) {
    const room = await Room.findById(roomId);

    if (!room) {
      throw new ApiError(404, 'Room not found');
    }

    // Update basic fields
    if (data.roomName) room.roomName = data.roomName;
    if (data.building) room.building = data.building;
    if (data.floor !== undefined) room.floor = data.floor;
    if (data.roomType) room.roomType = data.roomType;
    if (data.description !== undefined) room.description = data.description;
    if (data.imageUrl !== undefined) room.imageUrl = data.imageUrl;
    if (data.isActive !== undefined) room.isActive = data.isActive;
    if (data.isAvailableForBooking !== undefined) room.isAvailableForBooking = data.isAvailableForBooking;

    // Update features
    if (data.features) {
      room.features = { ...room.features, ...data.features };
    }

    // Update capacity (if not occupied)
    if (data.totalCapacity && !room.currentUsage.isOccupied) {
      room.totalCapacity = data.totalCapacity;

      // Regenerate seats if Individual mode and layout changed
      if (room.seatManagementMode === 'Individual') {
        if (data.seatsPerRow) room.seatsPerRow = data.seatsPerRow;
        if (data.totalRows) room.totalRows = data.totalRows;

        if (data.seatsPerRow || data.totalRows) {
          room.generateSeats();
        }
      }
    }

    room.lastModifiedBy = userId;
    await room.save();

    return room;
  }

  /**
   * Delete room (soft delete - mark as inactive)
   */
  static async deleteRoom(roomId) {
    const room = await Room.findById(roomId);

    if (!room) {
      throw new ApiError(404, 'Room not found');
    }

    // Check if room is currently in use
    if (room.currentUsage.isOccupied) {
      throw new ApiError(400, 'Cannot delete room that is currently in use');
    }

    // Soft delete - mark as inactive
    room.isActive = false;
    room.isAvailableForBooking = false;
    await room.save();

    return { message: 'Room deleted successfully' };
  }

  /**
   * Get seat map for visualization
   */
  static async getSeatMap(roomId) {
    const room = await Room.findById(roomId);

    if (!room) {
      throw new ApiError(404, 'Room not found');
    }

    return room.getSeatMap();
  }

  /**
   * Regenerate seats (Individual mode only)
   */
  static async regenerateSeats(roomId) {
    const room = await Room.findById(roomId);

    if (!room) {
      throw new ApiError(404, 'Room not found');
    }

    if (room.seatManagementMode !== 'Individual') {
      throw new ApiError(400, 'Seat generation is only available for Individual seat management mode');
    }

    if (room.currentUsage.isOccupied) {
      throw new ApiError(400, 'Cannot regenerate seats while room is in use');
    }

    room.generateSeats();
    await room.save();

    return { 
      message: 'Seats regenerated successfully',
      totalSeats: room.seats.length
    };
  }

  /**
   * Get available rooms for date range
   */
  static async getAvailableRooms(startDate, endDate, minCapacity = 0) {
    const rooms = await Room.find({
      isActive: true,
      isAvailableForBooking: true,
      totalCapacity: { $gte: minCapacity }
    }).sort({ building: 1, floor: 1, roomNumber: 1 });

    // Filter rooms that are not occupied during the date range
    const availableRooms = rooms.filter(room => {
      if (!room.currentUsage.isOccupied) return true;

      const usageStart = new Date(room.currentUsage.startTime);
      const usageEnd = new Date(room.currentUsage.endTime);
      const checkStart = new Date(startDate);
      const checkEnd = new Date(endDate);

      // Check if date ranges don't overlap
      return (checkEnd < usageStart || checkStart > usageEnd);
    });

    return availableRooms.map(room => {
      const roomObj = room.toObject();
      roomObj.availableCapacity = room.getAvailableCapacity();
      return roomObj;
    });
  }

  /**
   * Assign seat/capacity to user
   */
  static async assignSeatToUser(roomId, userId, registrationId, eventId, workshopId) {
    const room = await Room.findById(roomId);

    if (!room) {
      throw new ApiError(404, 'Room not found');
    }

    if (!room.isActive || !room.isAvailableForBooking) {
      throw new ApiError(400, 'Room is not available for booking');
    }

    try {
      const assignment = await room.assignSeat(userId, registrationId, eventId, workshopId);
      return assignment;
    } catch (error) {
      throw new ApiError(400, error.message);
    }
  }

  /**
   * Release seat/capacity
   */
  static async releaseSeat(roomId, seatNumber, registrationId) {
    const room = await Room.findById(roomId);

    if (!room) {
      throw new ApiError(404, 'Room not found');
    }

    try {
      await room.releaseSeat(seatNumber, registrationId);
      return { message: 'Seat released successfully' };
    } catch (error) {
      throw new ApiError(400, error.message);
    }
  }

  /**
   * Get room statistics
   */
  static async getRoomStatistics() {
    const stats = await Room.aggregate([
      {
        $facet: {
          byType: [
            { $group: { _id: '$roomType', count: { $sum: 1 }, totalCapacity: { $sum: '$totalCapacity' } } }
          ],
          byBuilding: [
            { $group: { _id: '$building', count: { $sum: 1 }, totalCapacity: { $sum: '$totalCapacity' } } }
          ],
          overview: [
            {
              $group: {
                _id: null,
                totalRooms: { $sum: 1 },
                totalCapacity: { $sum: '$totalCapacity' },
                activeRooms: { $sum: { $cond: ['$isActive', 1, 0] } },
                occupiedRooms: { $sum: { $cond: ['$currentUsage.isOccupied', 1, 0] } }
              }
            }
          ]
        }
      }
    ]);

    return stats[0];
  }

  /**
   * Export room assignments for an event/workshop
   */
  static async exportRoomAssignments(eventId, workshopId) {
    const query = {};
    
    if (eventId) {
      query['currentUsage.eventId'] = eventId;
    } else if (workshopId) {
      query['currentUsage.workshopId'] = workshopId;
    } else {
      throw new ApiError(400, 'Event ID or Workshop ID is required');
    }

    const rooms = await Room.find(query)
      .populate({
        path: 'seats.assignedTo.userId',
        select: 'firstName lastName email'
      })
      .populate({
        path: 'seats.assignedTo.registrationId',
        select: 'registrationNumber status'
      });

    const exportData = [];

    for (const room of rooms) {
      if (room.seatManagementMode === 'Individual') {
        // Individual seat assignments
        const occupiedSeats = room.seats.filter(seat => seat.status === 'Occupied');
        
        for (const seat of occupiedSeats) {
          if (seat.assignedTo && seat.assignedTo.userId) {
            exportData.push({
              roomNumber: room.roomNumber,
              roomName: room.roomName,
              building: room.building,
              floor: room.floor,
              seatNumber: seat.seatNumber,
              row: seat.row,
              position: seat.position,
              hasDesktop: seat.hasDesktop,
              userName: `${seat.assignedTo.userId.firstName} ${seat.assignedTo.userId.lastName}`,
              userEmail: seat.assignedTo.userId.email,
              registrationNumber: seat.assignedTo.registrationId?.registrationNumber || 'N/A',
              assignedAt: seat.assignedTo.assignedAt
            });
          }
        }
      } else {
        // Capacity only
        exportData.push({
          roomNumber: room.roomNumber,
          roomName: room.roomName,
          building: room.building,
          floor: room.floor,
          mode: 'Capacity_Only',
          totalCapacity: room.totalCapacity,
          registeredCount: room.currentUsage.registeredCount,
          availableCapacity: room.totalCapacity - room.currentUsage.registeredCount
        });
      }
    }

    return exportData;
  }
}

module.exports = { RoomService };
