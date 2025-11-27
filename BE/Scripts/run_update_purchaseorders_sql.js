/**
 * Script to update purchaseorders table for stock receipt support
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'website_coco',
  multipleStatements: true,
};

async function updatePurchaseOrdersTable() {
  console.log('========================================');
  console.log('Updating purchaseorders table...');
  console.log('========================================\n');

  let connection;
  try {
    const sqlFile = path.join(__dirname, 'update_purchaseorders_for_stock_receipt.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('📄 SQL file read successfully\n');

    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('✅ Connected to database\n');

    console.log('⚙️  Executing SQL...');
    await connection.query(sql);
    console.log('✅ SQL executed successfully\n');

    // Verify changes
    console.log('🔍 Verifying changes...');
    const [columns] = await connection.query('DESCRIBE purchaseorders');
    const supplierColumn = columns.find(col => col.Field === 'supplier_id');
    
    if (supplierColumn && supplierColumn.Null === 'YES') {
      console.log('✅ supplier_id column now allows NULL');
      console.log('   Comment:', supplierColumn.Comment || 'N/A');
    } else {
      console.log('⚠️  supplier_id column may not have been updated');
    }

    console.log('========================================');
    console.log('✅ Script completed successfully!');
    console.log('========================================\n');
  } catch (error) {
    console.error('========================================');
    console.error('❌ Error updating table:');
    console.error('========================================');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    if (error.sqlMessage) {
      console.error('SQL Error:', error.sqlMessage);
    }
    console.error('========================================\n');
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

if (require.main === module) {
  updatePurchaseOrdersTable()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { updatePurchaseOrdersTable };

