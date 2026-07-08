const { RoomService } = require('../services/RoomService');
const { ApiResponse } = require('../core/ApiResponse');
const { asyncHandler } = require('../core/asyncHandler');
const { Parser } = require('@json2csv/plainjs');

class RoomController {
  /**
   * Create a new room
   * POST /api/v1/rooms
   */
  static createRoom = asyncHandler(async (req, res) => {
    const room = await RoomService.createRoom(req.body, req.auth.userId);
    return ApiResponse.created(res, room, 'Room created successfully');
  });

  /**
   * Get all rooms
   * GET /api/v1/rooms
   */
  static getAllRooms = asyncHandler(async (req, res) => {
    const rooms = await RoomService.getAllRooms(req.query);
    return ApiResponse.ok(res, rooms, 'Rooms retrieved successfully');
  });

  /**
   * Get room by ID
   * GET /api/v1/rooms/:id
   */
  static getRoomById = asyncHandler(async (req, res) => {
    const room = await RoomService.getRoomById(req.params.id);
    return ApiResponse.ok(res, room, 'Room retrieved successfully');
  });

  /**
   * Update room
   * PUT /api/v1/rooms/:id
   */
  static updateRoom = asyncHandler(async (req, res) => {
    const room = await RoomService.updateRoom(req.params.id, req.body, req.auth.userId);
    return ApiResponse.ok(res, room, 'Room updated successfully');
  });

  /**
   * Delete room
   * DELETE /api/v1/rooms/:id
   */
  static deleteRoom = asyncHandler(async (req, res) => {
    const result = await RoomService.deleteRoom(req.params.id);
    return ApiResponse.ok(res, result, 'Room deleted successfully');
  });

  /**
   * Get seat map
   * GET /api/v1/rooms/:id/seat-map
   */
  static getSeatMap = asyncHandler(async (req, res) => {
    const seatMap = await RoomService.getSeatMap(req.params.id);
    return ApiResponse.ok(res, seatMap, 'Seat map retrieved successfully');
  });

  /**
   * Regenerate seats
   * POST /api/v1/rooms/:id/generate-seats
   */
  static regenerateSeats = asyncHandler(async (req, res) => {
    const result = await RoomService.regenerateSeats(req.params.id);
    return ApiResponse.ok(res, result, 'Seats regenerated successfully');
  });

  /**
   * Get available rooms
   * GET /api/v1/rooms/available
   */
  static getAvailableRooms = asyncHandler(async (req, res) => {
    const { startDate, endDate, minCapacity } = req.query;
    const rooms = await RoomService.getAvailableRooms(startDate, endDate, minCapacity);
    return ApiResponse.ok(res, rooms, 'Available rooms retrieved successfully');
  });

  /**
   * Get room statistics
   * GET /api/v1/rooms/statistics
   */
  static getRoomStatistics = asyncHandler(async (req, res) => {
    const stats = await RoomService.getRoomStatistics();
    return ApiResponse.ok(res, stats, 'Room statistics retrieved successfully');
  });

  /**
   * Export room assignments for event/workshop
   * GET /api/v1/rooms/export/:type/:id
   */
  static exportRoomAssignments = asyncHandler(async (req, res) => {
    const { type, id } = req.params;
    const { format = 'json' } = req.query;

    const eventId = type === 'event' ? id : null;
    const workshopId = type === 'workshop' ? id : null;

    const assignments = await RoomService.exportRoomAssignments(eventId, workshopId);

    if (format === 'csv') {
      // Convert to CSV
      const fields = assignments.length > 0 && assignments[0].seatNumber
        ? ['roomNumber', 'roomName', 'building', 'floor', 'seatNumber', 'row', 'position', 'hasDesktop', 'userName', 'userEmail', 'registrationNumber', 'assignedAt']
        : ['roomNumber', 'roomName', 'building', 'floor', 'mode', 'totalCapacity', 'registeredCount', 'availableCapacity'];

      const json2csvParser = new Parser({ fields });
      const csv = json2csvParser.parse(assignments);

      res.header('Content-Type', 'text/csv');
      res.header('Content-Disposition', `attachment; filename="${type}-${id}-room-assignments.csv"`);
      return res.send(csv);
    } else {
      // Return JSON
      return ApiResponse.ok(res, assignments, 'Room assignments exported successfully');
    }
  });
}

module.exports = { RoomController };
