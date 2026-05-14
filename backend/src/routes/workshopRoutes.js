const express = require('express');
const { WorkshopController } = require('../controllers/WorkshopController');
const { authenticate }       = require('../middleware/auth');

const router = express.Router();

// Public
router.get('/',    WorkshopController.list);
router.get('/:id', WorkshopController.detail);

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

// Approval
router.patch('/:id/registrations/:regId/approve', authenticate, WorkshopController.approveRegistration);
router.patch('/:id/registrations/:regId/reject',  authenticate, WorkshopController.rejectRegistration);

// Payment init
router.post('/registrations/:regId/pay', authenticate, WorkshopController.initPayment);
router.get('/registrations/:regId',      authenticate, WorkshopController.getRegistrationById);

// QR Check-in
router.post('/check-in', authenticate, WorkshopController.checkIn);

// Materials management
router.post('/:id/materials',          authenticate, WorkshopController.addMaterial);
router.put('/:id/materials/:index',    authenticate, WorkshopController.editMaterial);
router.delete('/:id/materials/:index', authenticate, WorkshopController.removeMaterial);

module.exports = { workshopRoutes: router };
