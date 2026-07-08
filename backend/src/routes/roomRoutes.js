const express = require('express');
const { RoomController } = require('../controllers/RoomController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

const router = express.Router();

// Public/authenticated routes
router.get('/rooms', authenticate, RoomController.getAllRooms);
router.get('/rooms/statistics', authenticate, authorize(['Moderator', 'Chief Patron']), RoomController.getRoomStatistics);
router.get('/rooms/available', authenticate, RoomController.getAvailableRooms);
router.get('/rooms/:id', authenticate, RoomController.getRoomById);
router.get('/rooms/:id/seat-map', authenticate, RoomController.getSeatMap);

// Admin-only routes
router.post('/rooms', authenticate, authorize(['Moderator', 'Chief Patron']), RoomController.createRoom);
router.put('/rooms/:id', authenticate, authorize(['Moderator', 'Chief Patron']), RoomController.updateRoom);
router.delete('/rooms/:id', authenticate, authorize(['Moderator', 'Chief Patron']), RoomController.deleteRoom);
router.post('/rooms/:id/generate-seats', authenticate, authorize(['Moderator', 'Chief Patron']), RoomController.regenerateSeats);

// Export room assignments
router.get('/rooms/export/:type/:id', authenticate, authorize(['Moderator', 'Chief Patron']), RoomController.exportRoomAssignments);

module.exports = { roomRoutes: router };
