/**
 * Email Configuration Checker
 * Kiểm tra và hướng dẫn cấu hình email service
 */

require('dotenv').config();
const EmailService = require('../Services/EmailService');

async function checkEmailConfig() {
  console.log('========================================');
  console.log('📧 Email Configuration Checker');
  console.log('========================================\n');

  // Step 1: Check environment variables
  console.log('📋 Step 1: Checking Environment Variables...');
  const emailUser = process.env.EMAIL_USERNAME || process.env.EMAIL_USER;
  const emailPassword = process.env.EMAIL_PASSWORD;
  const emailHost = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const emailPort = process.env.EMAIL_PORT || '587';
  const emailFrom = process.env.EMAIL_FROM || emailUser;

  console.log('  - EMAIL_USERNAME:', emailUser ? `${emailUser.substring(0, 3)}***` : '❌ NOT SET');
  console.log('  - EMAIL_PASSWORD:', emailPassword ? '✅ SET' : '❌ NOT SET');
  console.log('  - EMAIL_HOST:', emailHost);
  console.log('  - EMAIL_PORT:', emailPort);
  console.log('  - EMAIL_FROM:', emailFrom ? `${emailFrom.substring(0, 3)}***` : '❌ NOT SET');
  console.log('');

  if (!emailUser || !emailPassword) {
    console.error('❌ Missing required email configuration!');
    console.error('\n💡 Please add to .env file:');
    console.error('   EMAIL_USERNAME=your-email@gmail.com');
    console.error('   EMAIL_PASSWORD=your-app-password');
    console.error('   EMAIL_FROM=your-email@gmail.com');
    process.exit(1);
  }

  // Step 2: Check if password looks like App Password
  console.log('📋 Step 2: Validating Password Format...');
  if (emailPassword.length === 16 && /^[a-z]{4} [a-z]{4} [a-z]{4} [a-z]{4}$/i.test(emailPassword)) {
    console.log('  ✅ Password format looks like Gmail App Password (with spaces)');
    console.log('  ⚠️  Note: Remove spaces when using in .env');
  } else if (emailPassword.length === 16 && /^[a-z]{16}$/i.test(emailPassword.replace(/\s/g, ''))) {
    console.log('  ✅ Password format looks like Gmail App Password');
  } else if (emailPassword.length < 10) {
    console.log('  ⚠️  Password seems too short (might not be App Password)');
  } else {
    console.log('  ⚠️  Password format does not match typical Gmail App Password (16 characters)');
    console.log('  ⚠️  Gmail App Password should be 16 characters (letters only)');
  }
  console.log('');

  // Step 3: Verify connection
  console.log('📋 Step 3: Verifying Email Service Connection...');
  try {
    const verifyResult = await EmailService.verifyConnection();
    if (verifyResult.success) {
      console.log('  ✅ Email service connection verified successfully!');
      console.log('  ✅ Email OTP functionality should work correctly');
      console.log('\n========================================');
      console.log('✅ ALL CHECKS PASSED');
      console.log('========================================');
      return;
    } else {
      console.log('  ❌ Email service connection failed');
      console.log('  Error:', verifyResult.message);
      console.log('');

      // Provide specific guidance based on error
      if (verifyResult.message && verifyResult.message.includes('Application-specific password')) {
        console.error('❌ GMAIL APP PASSWORD REQUIRED');
        console.error('\n💡 This error means Gmail requires an App Password, not a regular password.');
        console.error('\n📝 Steps to fix:');
        console.error('   1. Go to: https://myaccount.google.com/security');
        console.error('   2. Enable "2-Step Verification" (if not already enabled)');
        console.error('   3. Go to: https://myaccount.google.com/apppasswords');
        console.error('   4. Select "Mail" and your device');
        console.error('   5. Click "Generate"');
        console.error('   6. Copy the 16-character password (e.g., "abcd efgh ijkl mnop")');
        console.error('   7. Update .env file:');
        console.error('      EMAIL_PASSWORD=abcdefghijklmnop  (remove spaces)');
        console.error('   8. Restart the server');
      } else if (verifyResult.message && verifyResult.message.includes('Invalid login')) {
        console.error('❌ INVALID CREDENTIALS');
        console.error('\n💡 Possible issues:');
        console.error('   - EMAIL_USERNAME is incorrect');
        console.error('   - EMAIL_PASSWORD is incorrect');
        console.error('   - For Gmail, you must use App Password (not regular password)');
      } else if (verifyResult.message && verifyResult.message.includes('ECONNECTION')) {
        console.error('❌ CONNECTION ERROR');
        console.error('\n💡 Possible issues:');
        console.error('   - Network connectivity problem');
        console.error('   - EMAIL_HOST is incorrect');
        console.error('   - Firewall blocking SMTP port');
      } else {
        console.error('❌ UNKNOWN ERROR');
        console.error('   Error message:', verifyResult.message);
      }
    }
  } catch (error) {
    console.error('  ❌ Error during verification:', error.message);
  }

  console.log('\n========================================');
  console.log('❌ EMAIL CONFIGURATION CHECK FAILED');
  console.log('========================================');
  process.exit(1);
}

// Run check
checkEmailConfig();

