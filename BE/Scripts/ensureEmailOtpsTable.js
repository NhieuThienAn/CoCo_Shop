/**
 * Script để đảm bảo bảng email_otps tồn tại
 * Tự động tạo bảng nếu chưa có
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { getDatabase } = require('../Config/database');

async function ensureEmailOtpsTable() {
  try {
    console.log('[ensureEmailOtpsTable] 🔍 Starting ensureEmailOtpsTable function...');
    console.log('[ensureEmailOtpsTable] 🔍 Getting database connection...');
    const db = getDatabase();
    
    if (!db) {
      console.error('[ensureEmailOtpsTable] ❌ Database connection is null!');
      throw new Error('Database connection not available');
    }
    console.log('[ensureEmailOtpsTable] ✅ Database connection obtained');
    console.log('[ensureEmailOtpsTable] 🔍 Checking email_otps table...');
    
    // Kiểm tra bảng có tồn tại không
    const [tables] = await db.execute("SHOW TABLES LIKE 'email_otps'");
    
    if (tables.length > 0) {
      console.log('[ensureEmailOtpsTable] ✅ Table email_otps already exists');
      // Kiểm tra và thêm cột registration_data nếu chưa có
      await ensureRegistrationDataColumn(db);
      return true;
    }
    
    // Bảng chưa tồn tại, tạo mới
    console.log('[ensureEmailOtpsTable] ⚠️  Table email_otps does not exist. Creating...');
    
    // Tạo bảng trực tiếp với đầy đủ cột cần thiết
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS \`email_otps\` (
        \`otp_id\` int(11) NOT NULL AUTO_INCREMENT,
        \`email\` varchar(255) NOT NULL,
        \`otp_code\` varchar(10) NOT NULL COMMENT 'Mã OTP (6 chữ số)',
        \`user_id\` int(11) DEFAULT NULL COMMENT 'ID của user (nếu có)',
        \`purpose\` varchar(50) NOT NULL DEFAULT 'email_verification' COMMENT 'Mục đích: email_verification, password_reset, etc.',
        \`registration_data\` longtext DEFAULT NULL COMMENT 'JSON chứa thông tin đăng ký tạm thời (chỉ dùng khi user_id = NULL)',
        \`expires_at\` datetime NOT NULL COMMENT 'Thời gian hết hạn',
        \`verified\` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Đã verify chưa',
        \`attempts\` int(11) NOT NULL DEFAULT 0 COMMENT 'Số lần thử sai',
        \`created_at\` datetime DEFAULT current_timestamp(),
        \`verified_at\` datetime DEFAULT NULL COMMENT 'Thời gian verify',
        PRIMARY KEY (\`otp_id\`),
        KEY \`idx_email_otp\` (\`email\`, \`otp_code\`, \`verified\`),
        KEY \`idx_email_purpose\` (\`email\`, \`purpose\`),
        KEY \`idx_expires_at\` (\`expires_at\`),
        KEY \`idx_user_id\` (\`user_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Bảng lưu trữ mã OTP xác thực email'
    `;
    
    try {
      await db.execute(createTableSQL);
      console.log('[ensureEmailOtpsTable] ✅ CREATE TABLE executed successfully');
    } catch (error) {
      if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.message.includes('already exists')) {
        console.log('[ensureEmailOtpsTable] ℹ️  Table already exists, skipping CREATE TABLE');
      } else {
        console.error('[ensureEmailOtpsTable] ❌ Error creating table:', error.message);
        throw error;
      }
    }
    
    // Đảm bảo foreign key constraint (nếu bảng users tồn tại)
    try {
      const [usersTable] = await db.execute("SHOW TABLES LIKE 'users'");
      if (usersTable.length > 0) {
        const [fkCheck] = await db.execute(`
          SELECT COUNT(*) as count 
          FROM information_schema.table_constraints 
          WHERE table_schema = DATABASE() 
          AND table_name = 'email_otps' 
          AND constraint_name = 'email_otps_ibfk_1'
        `);
        
        if (!fkCheck[0] || !fkCheck[0][0] || fkCheck[0][0].count === 0) {
          console.log('[ensureEmailOtpsTable] 🔄 Adding FOREIGN KEY constraint...');
          await db.execute(`
            ALTER TABLE \`email_otps\`
            ADD CONSTRAINT \`email_otps_ibfk_1\` 
            FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`user_id\`) ON DELETE CASCADE
          `);
          console.log('[ensureEmailOtpsTable] ✅ FOREIGN KEY constraint added');
        }
      }
    } catch (fkError) {
      if (fkError.code === 'ER_DUP_KEYNAME' || fkError.message.includes('Duplicate key name') || 
          fkError.message.includes('already exists')) {
        console.log('[ensureEmailOtpsTable] ℹ️  FOREIGN KEY constraint already exists');
      } else {
        console.warn('[ensureEmailOtpsTable] ⚠️  Could not add FOREIGN KEY constraint:', fkError.message);
      }
    }
    
    // Kiểm tra lại bảng đã được tạo chưa
    const [tablesAfter] = await db.execute("SHOW TABLES LIKE 'email_otps'");
    if (tablesAfter.length === 0) {
      throw new Error('Table email_otps was not created successfully');
    }
    console.log('[ensureEmailOtpsTable] ✅ Table email_otps confirmed to exist');
    
    // Tạo index riêng (nếu chưa có) - chỉ sau khi bảng đã tồn tại
    try {
      // Đợi một chút để đảm bảo bảng đã được commit
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const indexCheck = await db.execute(`
        SELECT COUNT(*) as count 
        FROM information_schema.statistics 
        WHERE table_schema = DATABASE() 
        AND table_name = 'email_otps' 
        AND index_name = 'idx_email_verified_expires'
      `);
      
      if (indexCheck[0] && indexCheck[0][0] && indexCheck[0][0].count === 0) {
        await db.execute(`
          CREATE INDEX idx_email_verified_expires ON email_otps (email, verified, expires_at)
        `);
        console.log('[ensureEmailOtpsTable] ✅ Created index idx_email_verified_expires');
      } else {
        console.log('[ensureEmailOtpsTable] ℹ️  Index idx_email_verified_expires already exists');
      }
    } catch (indexError) {
      if (indexError.code === 'ER_DUP_KEYNAME' || indexError.message.includes('Duplicate key name')) {
        console.log('[ensureEmailOtpsTable] ℹ️  Index already exists, skipping');
      } else if (indexError.message.includes("doesn't exist")) {
        console.warn('[ensureEmailOtpsTable] ⚠️  Could not create index (table may not be ready yet):', indexError.message);
        console.warn('[ensureEmailOtpsTable] ⚠️  Index will be created on next server restart');
      } else {
        console.warn('[ensureEmailOtpsTable] ⚠️  Could not create index:', indexError.message);
      }
    }
    
    // Đảm bảo cột registration_data tồn tại
    await ensureRegistrationDataColumn(db);
    
    console.log('[ensureEmailOtpsTable] ✅ Table email_otps created successfully');
    return true;
  } catch (error) {
    console.error('[ensureEmailOtpsTable] ❌ Error ensuring email_otps table:', error.message);
    throw error;
  }
}

/**
 * Đảm bảo cột registration_data tồn tại trong bảng email_otps
 */
async function ensureRegistrationDataColumn(db) {
  try {
    console.log('[ensureEmailOtpsTable] 🔍 Checking for registration_data column...');
    const [columns] = await db.execute(`
      SELECT COLUMN_NAME 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'email_otps' 
      AND COLUMN_NAME = 'registration_data'
    `);
    
    if (!columns || columns.length === 0) {
      console.log('[ensureEmailOtpsTable] 🔄 Adding registration_data column...');
      await db.execute(`
        ALTER TABLE \`email_otps\`
        ADD COLUMN \`registration_data\` longtext DEFAULT NULL COMMENT 'JSON chứa thông tin đăng ký tạm thời (chỉ dùng khi user_id = NULL)'
      `);
      console.log('[ensureEmailOtpsTable] ✅ Added registration_data column');
    } else {
      console.log('[ensureEmailOtpsTable] ℹ️  registration_data column already exists');
    }
  } catch (error) {
    console.warn('[ensureEmailOtpsTable] ⚠️  Could not ensure registration_data column:', error.message);
    // Không throw error, chỉ log warning
  }
}

module.exports = { ensureEmailOtpsTable };

