const express = require('express');
const router = express.Router();
const { UserController, TokenBlacklistController } = require('../Controllers');
const { authLimiter, passwordResetLimiter } = require('../Middlewares/rateLimiter');
router.post('/login', authLimiter, UserController.login);
const registerLimiter = process.env.NODE_ENV === 'production' ? authLimiter : (req, res, next) => next();
router.post('/register', registerLimiter, UserController.register);
router.post('/refresh-token', UserController.refreshToken);
router.post('/logout', UserController.logout);
router.post('/send-otp', authLimiter, UserController.sendOTP);
const verifyOTPLimiter = process.env.NODE_ENV === 'production' ? authLimiter : (req, res, next) => next();
router.post('/verify-otp', verifyOTPLimiter, UserController.verifyOTP);
router.post('/forgot-password', passwordResetLimiter, UserController.forgotPassword);
router.post('/verify-forgot-password-otp', passwordResetLimiter, UserController.verifyForgotPasswordOTP);
router.post('/reset-password', passwordResetLimiter, UserController.resetPassword);
if (process.env.NODE_ENV !== 'production') {
  router.get('/get-otp/:email', UserController.getLatestOTP);
}
router.post('/token/check', TokenBlacklistController.checkToken);
router.post('/token/blacklist', TokenBlacklistController.addToBlacklist);
router.post('/token/cleanup', TokenBlacklistController.cleanupExpired);
router.get('/tokens', TokenBlacklistController.getAll);
router.get('/tokens/:id', TokenBlacklistController.getById);
router.delete('/tokens/:id', TokenBlacklistController.delete);
module.exports = router;
