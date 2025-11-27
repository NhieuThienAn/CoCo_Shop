const express = require('express');
const router = express.Router();
const { UserController } = require('../Controllers');
const { authenticate, authorize, optionalAuthenticate } = require('../Middlewares');

/**
 * Public Routes - No authentication required
 */
router.get('/email/:email', UserController.getByEmail);
router.get('/username/:username', UserController.getByUsername);

/**
 * Protected Routes - Authentication required
 */

// Current user profile routes (using /me)
router.get('/me', authenticate, UserController.getCurrentUser);
router.put('/me', authenticate, UserController.updateCurrentUser);
router.put('/me/profile', authenticate, UserController.updateProfile);

/**
 * User CRUD Routes - Admin only
 */
router.get('/', authenticate, authorize(1), UserController.getAll); // Role 1 = Admin
router.get('/:id', authenticate, optionalAuthenticate, UserController.getById);
router.put('/:id', authenticate, authorize(1), UserController.update); // Admin only
router.delete('/:id', authenticate, authorize(1), UserController.delete); // Admin only

/**
 * User Specific Routes - Admin only
 */
router.get('/role/:roleId', authenticate, authorize(1), UserController.getByRole);
router.put('/:id/profile', authenticate, authorize(1), UserController.updateProfile);
router.put('/:id/last-login', authenticate, authorize(1), UserController.updateLastLogin);
router.put('/:id/increment-attempts', authenticate, authorize(1), UserController.incrementFailedAttempts);
router.put('/:id/reset-attempts', authenticate, authorize(1), UserController.resetFailedAttempts);

module.exports = router;

