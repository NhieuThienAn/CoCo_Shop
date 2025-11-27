/**
 * Test script để kiểm tra OTP workflow
 * Chạy: node Scripts/test_otp_workflow.js
 */
require('dotenv').config();
const { initDatabase, getDatabase, closeDatabase } = require('../Config/database');
const { emailOtp } = require('../Models');
const EmailService = require('../Services/EmailService');

async function testOTPWorkflow() {
  try {
    console.log('========================================');
    console.log('🧪 Testing OTP Workflow');
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

    // Test 1: Kiểm tra bảng email_otps tồn tại
    console.log('\n📋 Test 1: Checking email_otps table...');
    try {
      const [rows] = await db.execute("SHOW TABLES LIKE 'email_otps'");
      if (rows.length > 0) {
        console.log('✅ Table email_otps exists');
      } else {
        console.log('❌ Table email_otps does NOT exist');
        throw new Error('Table email_otps does not exist');
      }
    } catch (error) {
      console.error('❌ Error:', error.message);
      throw error;
    }

    // Test 2: Kiểm tra EmailService
    console.log('\n📧 Test 2: Checking EmailService...');
    const testEmail = 'test@example.com';
    const testOTP = '123456';
    const emailResult = await EmailService.sendOTPEmail(testEmail, testOTP, 'Test User');
    if (emailResult.success) {
      console.log('✅ EmailService is working');
      console.log('   Message ID:', emailResult.messageId);
    } else {
      console.log('⚠️  EmailService error:', emailResult.message);
      console.log('   This is OK if EMAIL_USERNAME/EMAIL_PASSWORD are not configured');
    }

    // Test 3: Tạo và lưu OTP
    console.log('\n💾 Test 3: Creating and saving OTP...');
    const testEmail2 = 'test2@example.com';
    const testOTP2 = '654321';
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);
    
    try {
      const otpResult = await emailOtp.create({
        email: testEmail2,
        otp_code: testOTP2,
        user_id: null,
        purpose: 'email_verification',
        expires_at: expiresAt,
      });
      console.log('✅ OTP created successfully');
      console.log('   OTP ID:', otpResult.insertId);
    } catch (error) {
      console.error('❌ Error creating OTP:', error.message);
      throw error;
    }

    // Test 4: Tìm OTP
    console.log('\n🔍 Test 4: Finding OTP...');
    try {
      const foundOTP = await emailOtp.findValidOTP(testEmail2, testOTP2, 'email_verification');
      if (foundOTP) {
        console.log('✅ OTP found successfully');
        console.log('   OTP ID:', foundOTP.otp_id);
        console.log('   Email:', foundOTP.email);
        console.log('   Expires at:', foundOTP.expires_at);
      } else {
        console.log('❌ OTP not found');
      }
    } catch (error) {
      console.error('❌ Error finding OTP:', error.message);
      throw error;
    }

    // Test 5: Rate limiting
    console.log('\n⏱️  Test 5: Checking rate limiting...');
    try {
      const recentCount = await emailOtp.countRecentOTPs(testEmail2, 10);
      console.log('✅ Rate limit check successful');
      console.log('   Recent OTPs in last 10 minutes:', recentCount);
    } catch (error) {
      console.error('❌ Error checking rate limit:', error.message);
      throw error;
    }

    console.log('\n========================================');
    console.log('✅ All tests passed!');
    console.log('========================================');

    await closeDatabase();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    await closeDatabase().catch(() => {});
    process.exit(1);
  }
}

testOTPWorkflow();

