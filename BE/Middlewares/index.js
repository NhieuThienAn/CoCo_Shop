/**
 * Export all middlewares
 */
module.exports = {
  // Error handling
  errorHandler: require('./errorHandler').errorHandler,
  notFoundHandler: require('./errorHandler').notFoundHandler,
  logger: require('./errorHandler').logger,
  
  // Rate limiting
  apiLimiter: require('./rateLimiter').apiLimiter,
  authLimiter: require('./rateLimiter').authLimiter,
  passwordResetLimiter: require('./rateLimiter').passwordResetLimiter,
  
  // Request logging
  devLogger: require('./requestLogger').devLogger,
  prodLogger: require('./requestLogger').prodLogger,
  apiLogger: require('./requestLogger').apiLogger,
  
  // Validation
  validateBody: require('./requestValidator').validateBody,
  validateParams: require('./requestValidator').validateParams,
  validateQuery: require('./requestValidator').validateQuery,
  
  // Authentication
  authenticate: require('./authMiddleware').authenticate,
  optionalAuthenticate: require('./authMiddleware').optionalAuthenticate,
  authorize: require('./authMiddleware').authorize,
};

