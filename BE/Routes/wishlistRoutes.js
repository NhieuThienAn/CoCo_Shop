const express = require('express');
const router = express.Router();
const { WishlistController } = require('../Controllers');
const { authenticate, authorize } = require('../Middlewares');

/**
 * Wishlist Routes - Protected (Authentication required)
 */

// Current user's wishlist routes (using /me)
router.get('/me', authenticate, WishlistController.getMyWishlist);
router.post('/me/add', authenticate, WishlistController.addToMyWishlist);
router.delete('/me/product/:productId', authenticate, WishlistController.removeFromMyWishlist);
router.get('/me/product/:productId/check', authenticate, WishlistController.checkMyWishlist);

/**
 * Wishlist CRUD Routes - Admin only
 */
router.get('/', authenticate, authorize(1), WishlistController.getAll);
router.get('/:id', authenticate, authorize(1), WishlistController.getById);
router.post('/', authenticate, authorize(1), WishlistController.create);
router.put('/:id', authenticate, authorize(1), WishlistController.update);
router.delete('/:id', authenticate, authorize(1), WishlistController.delete);

/**
 * Wishlist Specific Routes - Admin only
 */
router.get('/user/:userId', authenticate, authorize(1), WishlistController.getByUser);
router.post('/add', authenticate, authorize(1), WishlistController.addToWishlist);
router.delete('/user/:userId/product/:productId', authenticate, authorize(1), WishlistController.removeFromWishlist);
router.get('/user/:userId/product/:productId/check', authenticate, authorize(1), WishlistController.checkItem);

module.exports = router;

