const express = require('express');
const { RoomController } = require('../controllers/RoomController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');
const { manualBookingSchema } = require('../validators/roomValidators');

const router = express.Router();

// Public/authenticated routes
router.get('/rooms', authenticate, RoomController.getAllRooms);
router.get('/rooms/statistics', authenticate, authorize(['System Admin', 'Moderator', 'Chief Patron']), RoomController.getRoomStatistics);
router.get('/rooms/available', authenticate, RoomController.getAvailableRooms);
router.post('/rooms/check-availability', authenticate, RoomController.checkAvailability);
router.get('/rooms/:id', authenticate, RoomController.getRoomById);
router.get('/rooms/:id/seat-map', authenticate, RoomController.getSeatMap);
router.get('/rooms/:id/schedule', authenticate, RoomController.getRoomSchedule);
router.get('/rooms/:id/history', authenticate, RoomController.getRoomHistory);

// Admin-only routes
router.post('/rooms', authenticate, authorize(['System Admin', 'Moderator', 'Chief Patron']), RoomController.createRoom);
router.put('/rooms/:id', authenticate, authorize(['System Admin', 'Moderator', 'Chief Patron']), RoomController.updateRoom);
router.delete('/rooms/:id', authenticate, authorize(['System Admin', 'Moderator', 'Chief Patron']), RoomController.deleteRoom);
router.post('/rooms/:id/generate-seats', authenticate, authorize(['System Admin', 'Moderator', 'Chief Patron']), RoomController.regenerateSeats);

// Booking management (admin)
router.post('/rooms/:id/book', authenticate, authorize(['System Admin', 'Moderator', 'Chief Patron']), validate(manualBookingSchema), RoomController.createManualBooking);
router.put('/rooms/bookings/:bookingId', authenticate, authorize(['System Admin', 'Moderator', 'Chief Patron']), RoomController.updateBooking);
router.post('/rooms/bookings/:bookingId/cancel', authenticate, authorize(['System Admin', 'Moderator', 'Chief Patron']), RoomController.cancelBooking);

// Activity logs (admin)
router.get('/rooms/:id/logs', authenticate, authorize(['System Admin', 'Moderator', 'Chief Patron']), RoomController.getRoomLogs);

// Export room assignments
router.get('/rooms/export/:type/:id', authenticate, authorize(['System Admin', 'Moderator', 'Chief Patron']), RoomController.exportRoomAssignments);

module.exports = { roomRoutes: router };
