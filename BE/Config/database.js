/**
 * Database Configuration
 * Hỗ trợ MySQL với mysql2 hoặc các database client khác
 */

let dbConnection = null;
let dbStatus = {
  connected: false,
  lastCheck: null,
  error: null,
};

/**
 * Retry mechanism cho database connection
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} delay - Delay between retries (ms)
 */
const retry = async (fn, maxRetries = 5, delay = 2000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      console.log(`⚠️ Retry ${i + 1}/${maxRetries} in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

/**
 * Kiểm tra database connection health
 */
const checkDatabaseHealth = async () => {
  try {
    if (!dbConnection) {
      dbStatus.connected = false;
      dbStatus.error = 'Database connection not initialized';
      dbStatus.lastCheck = new Date();
      return false;
    }

    const connection = await dbConnection.getConnection();
    await connection.ping();
    connection.release();

    dbStatus.connected = true;
    dbStatus.error = null;
    dbStatus.lastCheck = new Date();
    return true;
  } catch (error) {
    dbStatus.connected = false;
    dbStatus.error = error.message;
    dbStatus.lastCheck = new Date();
    return false;
  }
};

/**
 * Khởi tạo database connection với retry mechanism
 * @param {Object} config - Database configuration
 * @param {string} config.type - 'mysql2' | 'custom'
 * @param {Object} config.connection - Connection config hoặc custom client
 * @param {number} config.maxRetries - Maximum retry attempts (default: 5)
 * @param {number} config.retryDelay - Delay between retries in ms (default: 2000)
 */
const initDatabase = async (config) => {
  const maxRetries = config.maxRetries || 5;
  const retryDelay = config.retryDelay || 2000;

  try {
    if (config.type === 'mysql2') {
      const mysql = require('mysql2/promise');
      
      const createPool = () => {
        return mysql.createPool({
          host: config.connection.host || process.env.DB_HOST || 'localhost',
          port: config.connection.port || process.env.DB_PORT || 3306,
          user: config.connection.user || process.env.DB_USER || 'root',
          password: config.connection.password || process.env.DB_PASSWORD || '',
          database: config.connection.database || process.env.DB_NAME || 'website_coco',
          waitForConnections: true,
          connectionLimit: config.connection.connectionLimit || parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
          queueLimit: 0,
          enableKeepAlive: true,
          keepAliveInitialDelay: 0,
          reconnect: true,
        });
      };

      // Retry connection với pool creation và test
      const pool = await retry(async () => {
        const poolInstance = createPool();
        const connection = await poolInstance.getConnection();
        await connection.ping();
        connection.release();
        return poolInstance;
      }, maxRetries, retryDelay);

      dbConnection = pool;
      dbStatus.connected = true;
      dbStatus.error = null;
      dbStatus.lastCheck = new Date();

      console.log('✅ Database connected successfully');
      console.log(`   Host: ${config.connection.host || process.env.DB_HOST || 'localhost'}`);
      console.log(`   Database: ${config.connection.database || process.env.DB_NAME || 'website_coco'}`);
      
      // Setup connection event handlers
      pool.on('connection', (connection) => {
        console.log('📊 New database connection established');
      });

      pool.on('error', (err) => {
        console.error('❌ Database pool error:', err.message);
        dbStatus.connected = false;
        dbStatus.error = err.message;
        dbStatus.lastCheck = new Date();
      });

      return pool;
    } else if (config.type === 'custom') {
      // Sử dụng custom database client
      dbConnection = config.connection;
      dbStatus.connected = true;
      dbStatus.error = null;
      dbStatus.lastCheck = new Date();
      console.log('✅ Custom database client initialized');
      return config.connection;
    } else {
      throw new Error('Database type không được hỗ trợ. Chọn: mysql2 hoặc custom');
    }
  } catch (error) {
    dbStatus.connected = false;
    dbStatus.error = error.message;
    dbStatus.lastCheck = new Date();
    console.error('❌ Database connection error:', error.message);
    throw error;
  }
};

/**
 * Lấy database connection
 */
const getDatabase = () => {
  if (!dbConnection) {
    throw new Error('Database chưa được khởi tạo. Gọi initDatabase() trước.');
  }
  return dbConnection;
};

/**
 * Lấy database status
 */
const getDatabaseStatus = () => {
  return {
    ...dbStatus,
    lastCheck: dbStatus.lastCheck ? dbStatus.lastCheck.toISOString() : null,
  };
};

/**
 * Đóng database connection
 */
const closeDatabase = async () => {
  if (dbConnection) {
    try {
      if (typeof dbConnection.end === 'function') {
        await dbConnection.end();
      } else if (typeof dbConnection.close === 'function') {
        await dbConnection.close();
      }
      dbConnection = null;
      dbStatus.connected = false;
      dbStatus.lastCheck = new Date();
      console.log('✅ Database connection closed');
    } catch (error) {
      console.error('❌ Error closing database connection:', error.message);
      throw error;
    }
  }
};

module.exports = {
  initDatabase,
  getDatabase,
  getDatabaseStatus,
  checkDatabaseHealth,
  closeDatabase,
};

