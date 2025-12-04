const rateLimit = require('express-rate-limit');
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10000,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
  },
  skipSuccessfulRequests: true,
});
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 55,
  message: {
    success: false,
    message: 'Too many password reset attempts, please try again later.',
  },
});
module.exports = {
  apiLimiter,
  authLimiter,
  passwordResetLimiter,
};
