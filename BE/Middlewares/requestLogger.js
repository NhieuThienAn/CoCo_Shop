const morgan = require('morgan');
const { logger } = require('./errorHandler');
morgan.token('body', (req) => {
  if (req.body && req.body.password) {
    const sanitized = { ...req.body };
    delete sanitized.password;
    return JSON.stringify(sanitized);
  }
  return JSON.stringify(req.body);
});
morgan.token('user', (req) => {
  return req.user ? req.user.userId : 'anonymous';
});
const stream = {
  write: (message) => {
    logger.info(message.trim());
  },
};
const devLogger = morgan('dev', {
  stream,
});
const prodLogger = morgan('combined', {
  stream,
  skip: (req, res) => res.statusCode < 400, 
});
const apiLogger = morgan(':method :url :status :response-time ms - :user - :body', {
  stream,
  skip: (req, res) => {
    return req.url === '/api/health' || req.url.startsWith('/static');
  },
});
const detailedApiLogger = (req, res, next) => {
  if (req.url === '/health' || req.url === '/api/health') {
    return next();
  }
  if (req.path.startsWith('/api')) {
    const timestamp = new Date().toISOString();
    const method = req.method;
    const url = req.originalUrl || req.url;
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userId = req.user?.userId || req.user?.id || 'anonymous';
    const userEmail = req.user?.email || 'N/A';
    let sanitizedBody = null;
    if (req.body && Object.keys(req.body).length > 0) {
      sanitizedBody = { ...req.body };
      if (sanitizedBody.password) {
        sanitizedBody.password = '[REDACTED]';
      }
      if (sanitizedBody.token) {
        sanitizedBody.token = '[REDACTED]';
      }
      if (sanitizedBody.refreshToken) {
        sanitizedBody.refreshToken = '[REDACTED]';
      }
    }
    console.log('\n' + '='.repeat(80));
    console.log(`📡 API REQUEST - ${timestamp}`);
    console.log('='.repeat(80));
    console.log(`🔹 Method: ${method}`);
    console.log(`🔹 URL: ${url}`);
    console.log(`🔹 IP: ${ip}`);
    console.log(`🔹 User ID: ${userId}`);
    console.log(`🔹 User Email: ${userEmail}`);
    if (Object.keys(req.query || {}).length > 0) {
      console.log(`🔹 Query Params:`, JSON.stringify(req.query, null, 2));
    }
    if (Object.keys(req.params || {}).length > 0) {
      console.log(`🔹 Route Params:`, JSON.stringify(req.params, null, 2));
    }
    if (sanitizedBody) {
      console.log(`🔹 Request Body:`, JSON.stringify(sanitizedBody, null, 2));
    }
    const importantHeaders = {
      'content-type': req.headers['content-type'],
      'user-agent': req.headers['user-agent'],
      'authorization': req.headers['authorization'] ? '[PRESENT]' : '[NOT PRESENT]',
      'origin': req.headers['origin'],
      'referer': req.headers['referer'],
    };
    console.log(`🔹 Headers:`, JSON.stringify(importantHeaders, null, 2));
    console.log('='.repeat(80) + '\n');
    const startTime = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;
      const statusEmoji = statusCode >= 200 && statusCode < 300 ? '✅' : 
                         statusCode >= 400 && statusCode < 500 ? '⚠️' : 
                         statusCode >= 500 ? '❌' : 'ℹ️';
      console.log(`📤 API RESPONSE - ${method} ${url}`);
      console.log(`   ${statusEmoji} Status: ${statusCode} | ⏱️  Duration: ${duration}ms`);
      console.log('='.repeat(80) + '\n');
    });
  }
  next();
};
module.exports = {
  devLogger,
  prodLogger,
  apiLogger,
  detailedApiLogger,
};
