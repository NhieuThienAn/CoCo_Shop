/**
 * Script kiểm tra bảng email_otps có tồn tại không
 */
require('dotenv').config();
const { initDatabase, getDatabase, closeDatabase } = require('../Config/database');

async function checkTable() {
  try {
    console.log('========================================');
    console.log('Checking email_otps table...');
    console.log('========================================');

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

    await initDatabase(dbConfig);
    const db = getDatabase();

    try {
      const [rows] = await db.execute("SHOW TABLES LIKE 'email_otps'");
      console.log('✅ Table email_otps exists:', rows.length > 0);
      
      if (rows.length > 0) {
        const [tableInfo] = await db.execute('DESCRIBE email_otps');
        console.log('✅ Table structure:');
        console.table(tableInfo);
        
        // Kiểm tra số lượng records
        const [countRows] = await db.execute('SELECT COUNT(*) as count FROM email_otps');
        console.log('✅ Total records:', countRows[0].count);
      } else {
        console.log('❌ Table email_otps does NOT exist!');
        console.log('Please run: node Scripts/run_email_otp_migration.js');
      }
    } catch (e) {
      console.error('❌ Error checking table:', e.message);
    }

    await closeDatabase();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await closeDatabase().catch(() => {});
    process.exit(1);
  }
}

checkTable();

