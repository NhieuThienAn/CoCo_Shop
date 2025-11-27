/**
 * Script để đảm bảo các order status được insert vào database
 * Chạy script này: node Scripts/ensureOrderStatuses.js
 */

require('dotenv').config();
const { initDatabase, closeDatabase } = require('../Config/database');

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
};

const ensureOrderStatuses = async () => {
  try {
    console.log('📊 Connecting to database...');
    await initDatabase(dbConfig);
    console.log('✅ Database connected');

    const { orderStatus } = require('../Models');
    
    console.log('🔍 Checking orderStatus methods...');
    console.log('Available methods:', Object.keys(orderStatus));
    
    if (typeof orderStatus.ensureOrderStatuses === 'function') {
      console.log('✅ ensureOrderStatuses function found');
      await orderStatus.ensureOrderStatuses();
      console.log('✅ Order statuses ensured successfully');
    } else {
      console.log('❌ ensureOrderStatuses function not found');
      console.log('Running SQL directly...');
      
      // Run SQL directly
      const statuses = [
        { status_id: 1, status_name: 'Chờ xác nhận', sort_order: 1 },
        { status_id: 2, status_name: 'Đã xác nhận', sort_order: 2 },
        { status_id: 3, status_name: 'Đang giao hàng', sort_order: 3 },
        { status_id: 4, status_name: 'Đã giao hàng', sort_order: 4 },
        { status_id: 5, status_name: 'Đã hủy', sort_order: 5 },
        { status_id: 6, status_name: 'Trả hàng', sort_order: 6 },
      ];

      // First, check what statuses exist
      const allStatuses = await orderStatus.findAll();
      console.log('📋 Existing statuses:', allStatuses.map(s => ({ id: s.status_id, name: s.status_name })));

      for (const status of statuses) {
        // Check if status_id exists
        const existing = await orderStatus.findById(status.status_id);
        if (existing) {
          console.log(`⏭️  Status ${status.status_id} (${status.status_name}) already exists, skipping`);
        } else {
          // Insert if not exists - use raw SQL to avoid unique constraint issues
          try {
            const sql = `
              INSERT INTO \`orderstatus\` (\`status_id\`, \`status_name\`, \`sort_order\`)
              VALUES (?, ?, ?)
            `;
            await orderStatus.execute(sql, [status.status_id, status.status_name, status.sort_order]);
            console.log(`✅ Inserted status: ${status.status_id} - ${status.status_name}`);
          } catch (error) {
            if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
              console.log(`⚠️  Status ${status.status_id} (${status.status_name}) has duplicate name, skipping`);
            } else {
              console.error(`❌ Error inserting status ${status.status_id}:`, error.message);
            }
          }
        }
      }
      
      // Verify critical statuses exist
      const criticalStatuses = [
        { id: 1, name: 'Chờ xác nhận' },
        { id: 2, name: 'Đã xác nhận' },
        { id: 3, name: 'Đang giao hàng' },
        { id: 4, name: 'Đã giao hàng' },
      ];
      
      for (const critical of criticalStatuses) {
        const exists = await orderStatus.findById(critical.id);
        if (exists) {
          console.log(`✅ Critical status ${critical.id} (${critical.name}) exists`);
        } else {
          console.log(`❌ CRITICAL: status_id = ${critical.id} (${critical.name}) does not exist!`);
        }
      }
    }

    await closeDatabase();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await closeDatabase().catch(() => {});
    process.exit(1);
  }
};

ensureOrderStatuses();

