/**
 * Script to create stockreceipts table
 * Run this script to create the table in your database
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Database configuration - Use same config as main app
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'website_coco',
  multipleStatements: true,
};

console.log('📋 Database Configuration:');
console.log(`   Host: ${DB_CONFIG.host}`);
console.log(`   User: ${DB_CONFIG.user}`);
console.log(`   Database: ${DB_CONFIG.database}`);
console.log('');

async function createStockReceiptsTable() {
  console.log('========================================');
  console.log('Creating stockreceipts table...');
  console.log('========================================\n');

  let connection;
  try {
    // Read SQL file
    const sqlFile = path.join(__dirname, 'create_stockreceipts_table.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('📄 SQL file read successfully');
    console.log('SQL content:', sql.substring(0, 200) + '...\n');

    // Connect to database
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('✅ Connected to database\n');

    // Execute SQL
    console.log('⚙️  Executing SQL...');
    await connection.query(sql);
    console.log('✅ SQL executed successfully\n');

    // Verify table exists
    console.log('🔍 Verifying table creation...');
    const [tables] = await connection.query(
      "SHOW TABLES LIKE 'stockreceipts'"
    );
    
    if (tables.length > 0) {
      console.log('✅ Table stockreceipts created successfully!\n');
      
      // Show table structure
      const [columns] = await connection.query('DESCRIBE stockreceipts');
      console.log('📊 Table structure:');
      console.table(columns);
    } else {
      console.log('❌ Table not found after creation');
    }

    console.log('========================================');
    console.log('✅ Script completed successfully!');
    console.log('========================================\n');
  } catch (error) {
    console.error('========================================');
    console.error('❌ Error creating table:');
    console.error('========================================');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error stack:', error.stack);
    console.error('========================================\n');
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run if executed directly
if (require.main === module) {
  createStockReceiptsTable()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { createStockReceiptsTable };

