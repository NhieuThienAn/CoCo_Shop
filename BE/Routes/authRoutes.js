const express = require('express');
const router = express.Router();
const { UserController, TokenBlacklistController } = require('../Controllers');
const { authLimiter, passwordResetLimiter } = require('../Middlewares/rateLimiter');

/**
 * Authentication Routes
 * Note: Rate limiting is applied at app level, but can be overridden here if needed
 */
router.post('/login', authLimiter, UserController.login);
// Register: No rate limiting in development mode for testing
const registerLimiter = process.env.NODE_ENV === 'production' ? authLimiter : (req, res, next) => next();
router.post('/register', registerLimiter, UserController.register);
router.post('/refresh-token', UserController.refreshToken);
router.post('/logout', UserController.logout);

/**
 * Email OTP Verification Routes
 */
router.post('/send-otp', authLimiter, UserController.sendOTP);
// Verify OTP: No rate limiting in development mode for testing
const verifyOTPLimiter = process.env.NODE_ENV === 'production' ? authLimiter : (req, res, next) => next();
router.post('/verify-otp', verifyOTPLimiter, UserController.verifyOTP);
// Development only: Get latest OTP from database (no rate limiting)
if (process.env.NODE_ENV !== 'production') {
  router.get('/get-otp/:email', UserController.getLatestOTP);
}

/**
 * Token Blacklist Routes
 */
router.post('/token/check', TokenBlacklistController.checkToken);
router.post('/token/blacklist', TokenBlacklistController.addToBlacklist);
router.post('/token/cleanup', TokenBlacklistController.cleanupExpired);
router.get('/tokens', TokenBlacklistController.getAll);
router.get('/tokens/:id', TokenBlacklistController.getById);
router.delete('/tokens/:id', TokenBlacklistController.delete);

module.exports = router;

