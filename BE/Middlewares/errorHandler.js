const winston = require('winston');
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'coco-api' },
  transports: [
    new winston.transports.File({ filename: 'Logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'Logs/combined.log' }),
  ],
});
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}
const errorHandler = (err, req, res, next) => {
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    body: req.body,
    params: req.params,
    query: req.query,
  });
  const statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal server error';
  if (err.name === 'ValidationError') {
    message = 'Validation Error: ' + message;
  } else if (err.name === 'UnauthorizedError') {
    message = 'Unauthorized: ' + message;
  } else if (err.name === 'CastError') {
    message = 'Invalid ID format';
  } else if (err.code === 'ER_DUP_ENTRY') {
    message = 'Duplicate entry: This record already exists';
  } else if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    message = 'Referenced record does not exist';
  }
  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && {
      stack: err.stack,
      error: err,
    }),
  });
};
const notFoundHandler = (req, res) => {
  logger.warn({
    message: 'Route not found',
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method,
  });
};
module.exports = {
  errorHandler,
  notFoundHandler,
  logger,
};
