const express = require('express');
const { WorkshopController } = require('../controllers/WorkshopController');
const { authenticate, optionalAuthenticate } = require('../middleware/auth');

const router = express.Router();

// Public (audience gating applied inside the controller when user context exists)
router.get('/',    optionalAuthenticate, WorkshopController.list);
router.get('/:id', optionalAuthenticate, WorkshopController.detail);

// Payment callbacks (no auth — called by SSLCommerz)
router.post('/payment/success', WorkshopController.paymentSuccess);
router.post('/payment/fail',    WorkshopController.paymentFail);
router.post('/payment/cancel',  WorkshopController.paymentCancel);
router.post('/payment/ipn',     WorkshopController.paymentIpn);

// Authenticated
router.post('/',    authenticate, WorkshopController.create);
router.patch('/:id', authenticate, WorkshopController.update);
router.delete('/:id', authenticate, WorkshopController.remove);

// Registration
router.post('/:id/register',       authenticate, WorkshopController.register);
router.get('/:id/my-registration', authenticate, WorkshopController.myRegistration);
router.get('/:id/registrations',   authenticate, WorkshopController.listRegistrations);

// Follow/Unfollow workshops
router.post('/:id/follow', authenticate, WorkshopController.followWorkshop);
router.delete('/:id/follow', authenticate, WorkshopController.unfollowWorkshop);

// Approval
router.patch('/:id/registrations/:regId/approve', authenticate, WorkshopController.approveRegistration);
router.patch('/:id/registrations/:regId/reject',  authenticate, WorkshopController.rejectRegistration);

// Payment init
router.post('/registrations/:regId/pay', authenticate, WorkshopController.initPayment);
router.get('/registrations/:regId',      authenticate, WorkshopController.getRegistrationById);

// QR Check-in
router.post('/check-in', authenticate, WorkshopController.checkIn);

// Materials management
router.get('/:id/materials',           authenticate, WorkshopController.getMaterials);
router.post('/:id/materials',          authenticate, WorkshopController.addMaterial);
router.put('/:id/materials/:index',    authenticate, WorkshopController.editMaterial);
router.delete('/:id/materials/:index', authenticate, WorkshopController.removeMaterial);

module.exports = { workshopRoutes: router };
