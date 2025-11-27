/**
 * Server entry point
 */
require('dotenv').config();
const { initDatabase, closeDatabase, checkDatabaseHealth } = require('./Config/database');
const app = require('./app');

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Database configuration
const dbConfig = {
  type: process.env.DB_TYPE || 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'website_coco',
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
  },
  maxRetries: parseInt(process.env.DB_MAX_RETRIES) || 5,
  retryDelay: parseInt(process.env.DB_RETRY_DELAY) || 2000,
};

let server = null;

/**
 * Khởi động server với database connection
 */
const startServer = async () => {
  try {
    console.log('='.repeat(50));
    console.log('🚀 Starting CoCo Backend Server...');
    console.log('='.repeat(50));

    // Step 1: Initialize database connection
    console.log('\n📊 Step 1: Connecting to database...');
    try {
      await initDatabase(dbConfig);
      console.log('✅ Database connection established');
      
      // Ensure order statuses exist in database
      try {
        const { orderStatus } = require('./Models');
        await orderStatus.ensureOrderStatuses();
      } catch (error) {
        console.warn('⚠️ Warning: Could not ensure order statuses:', error.message);
      }
      
      // Ensure email_otps table exists
      console.log('📧 Step 1.5: Ensuring email_otps table exists...');
      try {
        const { ensureEmailOtpsTable } = require('./Scripts/ensureEmailOtpsTable');
        console.log('📧 ensureEmailOtpsTable function loaded');
        await ensureEmailOtpsTable();
        console.log('✅ email_otps table ensured');
      } catch (error) {
        console.error('❌❌❌ CRITICAL ERROR: Could not ensure email_otps table ❌❌❌');
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('Error name:', error.name);
        console.error('Error code:', error.code);
        // Don't exit, but log clearly
        console.warn('⚠️ Warning: Server will continue but OTP functionality WILL NOT WORK');
        console.warn('⚠️ Please run migration manually: node Scripts/run_email_otp_migration.js');
      }
      
      // Verify email service configuration
      console.log('📧 Step 1.6: Verifying email service configuration...');
      try {
        const EmailService = require('./Services/EmailService');
        const verifyResult = await EmailService.verifyConnection();
        if (verifyResult.success) {
          console.log('✅ Email service verified and ready');
        } else {
          console.error('❌ Email service verification failed:', verifyResult.message);
          console.warn('⚠️ Warning: Email OTP functionality may not work');
          console.warn('⚠️ Please check EMAIL_USERNAME and EMAIL_PASSWORD in .env');
          if (verifyResult.message && verifyResult.message.includes('Application-specific password')) {
            console.warn('⚠️ For Gmail, you MUST use App Password (not regular password)');
            console.warn('⚠️ Steps: 1) Enable 2-Step Verification 2) Generate App Password 3) Update .env');
          }
        }
      } catch (error) {
        console.error('❌ Error verifying email service:', error.message);
        console.warn('⚠️ Warning: Email OTP functionality may not work');
      }
      
      console.log('');
    } catch (error) {
      console.error('❌ Failed to connect to database:', error.message);
      console.error('⚠️ Server will start but database operations may fail');
      console.error('💡 Please check your database configuration in .env file\n');
      
      // Option: Exit if DB is critical
      if (process.env.DB_REQUIRED === 'true') {
        console.error('❌ Database is required. Exiting...');
        process.exit(1);
      }
    }

    // Step 2: Start HTTP server
    console.log('🌐 Step 2: Starting HTTP server...');
    server = app.listen(PORT, () => {
      console.log('='.repeat(50));
      console.log(`✅ CoCo Backend Server Started Successfully!`);
      console.log('='.repeat(50));
      console.log(`📦 Environment: ${NODE_ENV}`);
      console.log(`🌐 Port: ${PORT}`);
      console.log(`📚 API: http://localhost:${PORT}/api`);
      console.log(`🏥 Health: http://localhost:${PORT}/health`);
      console.log(`💾 Database: ${dbConfig.connection.database}@${dbConfig.connection.host}:${dbConfig.connection.port}`);
      console.log('='.repeat(50));
    });

    // Step 3: Setup periodic health check
    if (process.env.DB_HEALTH_CHECK_INTERVAL) {
      const interval = parseInt(process.env.DB_HEALTH_CHECK_INTERVAL) || 30000; // Default 30s
      setInterval(async () => {
        await checkDatabaseHealth();
      }, interval);
      console.log(`\n💚 Database health check enabled (every ${interval}ms)`);
    }

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

/**
 * Graceful shutdown
 */
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} signal received: closing HTTP server and database connections...`);
  
  if (server) {
    server.close(async () => {
      console.log('✅ HTTP server closed');
      
      try {
        await closeDatabase();
        console.log('✅ Database connections closed');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error closing database:', error);
        process.exit(1);
      }
    });

    // Force close after 10 seconds
    setTimeout(() => {
      console.error('⚠️ Forcing shutdown after timeout');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Handle termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start the server
startServer();

