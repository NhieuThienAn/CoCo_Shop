const express = require('express');
const router = express.Router();
const { AddressController } = require('../Controllers');
const { authenticate, authorize } = require('../Middlewares');

/**
 * Address Routes - Protected (Authentication required)
 */

// Current user's addresses routes (using /me)
router.get('/me', authenticate, AddressController.getMyAddresses);
router.get('/me/default', authenticate, AddressController.getMyDefaultAddress);
router.post('/me', authenticate, AddressController.createMyAddress);
router.put('/me/:id', authenticate, AddressController.updateMyAddress);
router.delete('/me/:id', authenticate, AddressController.deleteMyAddress);
router.put('/me/:id/default', authenticate, AddressController.setMyDefaultAddress);

/**
 * Address CRUD Routes - Admin only
 */
router.get('/', authenticate, authorize(1), AddressController.getAll);
router.get('/:id', authenticate, authorize(1), AddressController.getById);
router.post('/', authenticate, authorize(1), AddressController.create);
router.put('/:id', authenticate, authorize(1), AddressController.update);
router.delete('/:id', authenticate, authorize(1), AddressController.delete);

/**
 * Address Specific Routes - Admin only
 */
router.get('/user/:userId', authenticate, authorize(1), AddressController.getByUser);
router.get('/user/:userId/default', authenticate, authorize(1), AddressController.getDefaultShipping);
router.put('/default/set', authenticate, authorize(1), AddressController.setDefaultShipping);

module.exports = router;

