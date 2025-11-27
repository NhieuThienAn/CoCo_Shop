const express = require('express');
const router = express.Router();
const { ReviewController } = require('../Controllers');
const { authenticate, authorize, optionalAuthenticate } = require('../Middlewares');

/**
 * Review Routes
 */

// Public routes - No authentication required
router.get('/product/:productId', optionalAuthenticate, ReviewController.getByProduct);
router.get('/product/:productId/rating', ReviewController.getProductRating);

// Current user's reviews routes (using /me)
router.get('/me', authenticate, ReviewController.getMyReviews);
router.post('/me', authenticate, ReviewController.createMyReview);
router.put('/me/:id', authenticate, ReviewController.updateMyReview);
router.delete('/me/:id', authenticate, ReviewController.deleteMyReview);
router.post('/me/create-or-update', authenticate, ReviewController.createOrUpdateMyReview);

/**
 * Review CRUD Routes - Admin only
 */
router.get('/', authenticate, authorize(1), ReviewController.getAll);
router.get('/:id', optionalAuthenticate, ReviewController.getById);
router.post('/', authenticate, authorize(1), ReviewController.create);
router.put('/:id', authenticate, authorize(1), ReviewController.update);
router.delete('/:id', authenticate, authorize(1), ReviewController.delete);

/**
 * Review Specific Routes - Admin only
 */
router.get('/user/:userId', authenticate, authorize(1), ReviewController.getByUser);
router.post('/create-or-update', authenticate, authorize(1), ReviewController.createOrUpdate);

module.exports = router;

