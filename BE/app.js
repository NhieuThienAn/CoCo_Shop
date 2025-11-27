const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const compression = require('compression');
const hpp = require('hpp');
// const xss = require('xss-clean'); // Disabled due to Express 5.x compatibility issues
// const mongoSanitize = require('express-mongo-sanitize'); // Disabled due to Express 5.x compatibility issues
require('dotenv').config();

// Debug logger (only if debug module is available)
let debug;
try {
  debug = require('debug')('app:server');
} catch (err) {
  // Fallback if debug module has issues
  debug = (...args) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEBUG]', ...args);
    }
  };
}

// Import routes
const apiRoutes = require('./Routes');

// Import middlewares
const { errorHandler, notFoundHandler, logger } = require('./Middlewares/errorHandler');
const { apiLimiter, authLimiter } = require('./Middlewares/rateLimiter');
const { devLogger, prodLogger, detailedApiLogger } = require('./Middlewares/requestLogger');

// Initialize Express app
const app = express();

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// ============================================
// SECURITY MIDDLEWARES
// ============================================

// Helmet - Set various HTTP headers for security
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow embedding for React dev server
}));

// CORS configuration - Optimized for React frontend
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.CORS_ORIGIN 
      ? process.env.CORS_ORIGIN.split(',')
      : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173', 'http://localhost:5174'];
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.CORS_ORIGIN === '*') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies and authorization headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Limit'],
  maxAge: 86400, // 24 hours
};

app.use(cors(corsOptions));

// HPP - Protect against HTTP Parameter Pollution attacks
app.use(hpp());

// XSS Protection - Custom middleware (xss-clean has Express 5.x compatibility issues)
// Helmet already provides XSS protection via headers, but we add extra sanitization here
// Note: We sanitize body only, as modifying req.query directly can cause issues with Express 5.x
app.use((req, res, next) => {
  // Sanitize body parameters only (query params are handled by HPP middleware)
  if (req.body && typeof req.body === 'object') {
    const sanitize = (obj) => {
      for (let key in obj) {
        if (typeof obj[key] === 'string') {
          obj[key] = obj[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitize(obj[key]);
        }
      }
    };
    sanitize(req.body);
  }
  next();
});

// Mongo Sanitize - Prevent NoSQL injection attacks
// Note: Only sanitize body and params, not query (Express 5.x compatibility)
app.use((req, res, next) => {
  // Sanitize body
  if (req.body && typeof req.body === 'object') {
    const sanitizeObject = (obj) => {
      for (let key in obj) {
        if (key.includes('$') || key.includes('.')) {
          const sanitizedKey = key.replace(/[$.]/g, '_');
          obj[sanitizedKey] = obj[key];
          delete obj[key];
          logger.warn(`Sanitized key: ${key} -> ${sanitizedKey} in request to ${req.originalUrl}`);
        } else if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          sanitizeObject(obj[key]);
        }
      }
    };
    sanitizeObject(req.body);
  }
  
  // Sanitize params
  if (req.params && typeof req.params === 'object') {
    for (let key in req.params) {
      if (key.includes('$') || key.includes('.')) {
        const sanitizedKey = key.replace(/[$.]/g, '_');
        req.params[sanitizedKey] = req.params[key];
        delete req.params[key];
        logger.warn(`Sanitized param key: ${key} -> ${sanitizedKey} in request to ${req.originalUrl}`);
      }
    }
  }
  
  next();
});

// ============================================
// PARSING MIDDLEWARES
// ============================================

// Body parser middleware
app.use(bodyParser.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    // Store raw body for signature verification (e.g., webhooks)
    req.rawBody = buf.toString();
  },
}));
app.use(bodyParser.urlencoded({ 
  extended: true, 
  limit: '10mb',
  parameterLimit: 100,
}));

// Cookie parser middleware
app.use(cookieParser());

// ============================================
// PERFORMANCE MIDDLEWARES
// ============================================

// Compression middleware - Compress responses
app.use(compression({
  level: 6,
  threshold: 1024, // Only compress if response size > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
}));

// ============================================
// LOGGING MIDDLEWARES
// ============================================

// Detailed API request logger - Logs all API calls from frontend
// This should be placed before other logging middlewares to capture all requests
app.use(detailedApiLogger);

// Request logging
if (process.env.NODE_ENV === 'production') {
  app.use(prodLogger);
} else {
  app.use(devLogger);
  if (debug) debug('Development mode: Detailed logging enabled');
}

// ============================================
// RATE LIMITING
// ============================================

// Apply rate limiting to all API routes
app.use('/api', apiLimiter);

// Apply stricter rate limiting to auth routes
app.use('/api/auth', authLimiter);

// ============================================
// HEALTH CHECK & INFO ENDPOINTS
// ============================================

// Health check endpoint (before rate limiting)
app.get('/health', async (req, res) => {
  const { getDatabaseStatus, checkDatabaseHealth } = require('./Config/database');
  
  // Check database health
  const dbHealthy = await checkDatabaseHealth();
  const dbStatus = getDatabaseStatus();
  
  const healthStatus = {
    success: true,
    status: dbHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      connected: dbStatus.connected,
      lastCheck: dbStatus.lastCheck,
      error: dbStatus.error,
    },
  };

  const statusCode = dbHealthy ? 200 : 503; // Service Unavailable if DB is down
  res.status(statusCode).json(healthStatus);
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CoCo Backend API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    documentation: '/api',
    health: '/health',
  });
});

// ============================================
// API ROUTES
// ============================================

app.use('/api', apiRoutes);

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler - Must be after all routes
app.use(notFoundHandler);

// Error handler middleware - Must be last
app.use(errorHandler);

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  if (app.server) {
    app.server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  }
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  if (app.server) {
    app.server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  }
});

// ============================================
// EXPORT & START SERVER
// ============================================

// Export app for testing or server file
module.exports = app;

// Start server if this file is run directly
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  const NODE_ENV = process.env.NODE_ENV || 'development';
  
  app.server = app.listen(PORT, () => {
    logger.info(`🚀 Server is running on port ${PORT}`);
    logger.info(`📦 Environment: ${NODE_ENV}`);
    logger.info(`📚 API Documentation: http://localhost:${PORT}/api`);
    logger.info(`🏥 Health Check: http://localhost:${PORT}/health`);
    logger.info(`🌐 CORS Origins: ${process.env.CORS_ORIGIN || 'http://localhost:3000, http://localhost:3001'}`);
    
    if (debug) debug(`Server started in ${NODE_ENV} mode`);
  });

  // Handle server errors
  app.server.on('error', (err) => {
    logger.error('Server error:', err);
    if (err.code === 'EADDRINUSE') {
      logger.error(`Port ${PORT} is already in use`);
      process.exit(1);
    }
  });
}
