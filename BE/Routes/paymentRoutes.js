const express = require('express');
const router = express.Router();
const { PaymentController } = require('../Controllers');
const { authenticate, authorize, optionalAuthenticate } = require('../Middlewares');

/**
 * Payment Routes
 */

// Current user's payments routes (using /me)
router.get('/me', authenticate, PaymentController.getMyPayments);
router.get('/me/order/:orderId', authenticate, PaymentController.getMyPaymentByOrder);

// Payment creation - Authenticated users
router.post('/momo/create', authenticate, PaymentController.createMoMoPayment);

// Payment webhook - Public (no auth, but should verify signature)
router.post('/momo/ipn', PaymentController.handleMoMoIPN);
router.post('/momo/query', authenticate, PaymentController.queryMoMoStatus);

/**
 * Payment CRUD Routes - Admin only
 */
router.get('/', authenticate, authorize(1), PaymentController.getAll);
router.get('/:id', authenticate, authorize(1), PaymentController.getById);
router.post('/', authenticate, authorize(1), PaymentController.create);
router.put('/:id', authenticate, authorize(1), PaymentController.update);
router.delete('/:id', authenticate, authorize(1), PaymentController.delete);

/**
 * Payment Specific Routes - Admin only
 */
router.get('/order/:orderId', authenticate, authorize(1), PaymentController.getByOrder);
router.get('/gateway/:gateway', authenticate, authorize(1), PaymentController.getByGateway);
router.get('/status/:statusId', authenticate, authorize(1), PaymentController.getByStatus);
router.post('/:id/capture', authenticate, authorize(1), PaymentController.capture);
router.post('/:id/refund', authenticate, authorize(1), PaymentController.refund);

module.exports = router;

