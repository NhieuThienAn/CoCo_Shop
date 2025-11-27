const express = require('express');
const router = express.Router();
const { CartItemController } = require('../Controllers');
const { authenticate, authorize } = require('../Middlewares');

/**
 * Cart Routes - Protected (Authentication required)
 */

// Current user's cart routes (using /me)
router.get('/me', authenticate, CartItemController.getMyCart);
router.get('/me/total', authenticate, CartItemController.getMyCartTotal);
router.post('/me/add', authenticate, CartItemController.addToMyCart);
router.post('/me/buy-now', authenticate, CartItemController.buyNow);
router.put('/me/product/:productId', authenticate, CartItemController.updateMyCartItem);
router.delete('/me/product/:productId', authenticate, CartItemController.removeFromMyCart);
router.delete('/me/clear', authenticate, CartItemController.clearMyCart);

/**
 * Cart Routes by User ID - Admin only
 */
router.get('/user/:userId', authenticate, authorize(1), CartItemController.getByUser);
router.get('/user/:userId/total', authenticate, authorize(1), CartItemController.getTotal);

/**
 * Cart CRUD Routes - Admin only
 */
router.get('/', authenticate, authorize(1), CartItemController.getAll);
router.get('/:id', authenticate, authorize(1), CartItemController.getById);
router.post('/', authenticate, authorize(1), CartItemController.create);
router.put('/:id', authenticate, authorize(1), CartItemController.update);
router.delete('/:id', authenticate, authorize(1), CartItemController.delete);

module.exports = router;

