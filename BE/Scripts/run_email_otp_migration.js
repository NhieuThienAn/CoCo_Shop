/**
 * Script để tạo bảng email_otps
 * Chạy: node Scripts/run_email_otp_migration.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { initDatabase, getDatabase, closeDatabase } = require('../Config/database');

async function runMigration() {
  try {
    console.log('========================================');
    console.log('Running email_otps table migration...');
    console.log('========================================');

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

    // Initialize database connection
    await initDatabase(dbConfig);
    const db = getDatabase();
    const sqlPath = path.join(__dirname, 'create_email_otps_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Split SQL by semicolons and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await db.execute(statement);
          console.log('✅ Executed:', statement.substring(0, 50) + '...');
        } catch (error) {
          // Ignore "table already exists" errors
          if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.message.includes('already exists')) {
            console.log('⚠️  Table already exists, skipping...');
          } else {
            throw error;
          }
        }
      }
    }

    console.log('========================================');
    console.log('✅ Migration completed successfully!');
    console.log('========================================');
    
    // Close database connection
    await closeDatabase();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await closeDatabase().catch(() => {}); // Try to close even on error
    process.exit(1);
  }
}

runMigration();

