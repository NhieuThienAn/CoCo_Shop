/**
 * Email Configuration Fixer
 * Hướng dẫn chi tiết cách cấu hình Gmail App Password
 */

require('dotenv').config();

console.log('========================================');
console.log('📧 Gmail App Password Configuration Guide');
console.log('========================================\n');

// Check current configuration
const emailUser = process.env.EMAIL_USERNAME || process.env.EMAIL_USER;
const emailPassword = process.env.EMAIL_PASSWORD;
const emailFrom = process.env.EMAIL_FROM || emailUser;

console.log('📋 Current Configuration:');
console.log('  - EMAIL_USERNAME:', emailUser || '❌ NOT SET');
console.log('  - EMAIL_PASSWORD:', emailPassword ? `${emailPassword.length} characters` : '❌ NOT SET');
console.log('  - EMAIL_FROM:', emailFrom || '❌ NOT SET');
console.log('');

if (!emailUser) {
  console.error('❌ EMAIL_USERNAME is not set!');
  console.error('   Please add to .env: EMAIL_USERNAME=your-email@gmail.com\n');
}

if (!emailPassword) {
  console.error('❌ EMAIL_PASSWORD is not set!');
  console.error('   Please add to .env: EMAIL_PASSWORD=your-app-password\n');
} else {
  // Check password format
  const passwordWithoutSpaces = emailPassword.replace(/\s/g, '');
  if (passwordWithoutSpaces.length !== 16) {
    console.warn('⚠️  WARNING: Password length is', passwordWithoutSpaces.length, 'characters');
    console.warn('   Gmail App Password should be exactly 16 characters\n');
  }
  
  if (emailPassword.includes(' ')) {
    console.warn('⚠️  WARNING: Password contains spaces');
    console.warn('   Remove spaces when using in .env file\n');
  }
}

console.log('========================================');
console.log('📝 STEP-BY-STEP GUIDE TO FIX EMAIL CONFIG');
console.log('========================================\n');

console.log('Step 1: Enable 2-Step Verification');
console.log('  → Go to: https://myaccount.google.com/security');
console.log('  → Click "2-Step Verification"');
console.log('  → Follow the setup process');
console.log('  → Verify your phone number');
console.log('');

console.log('Step 2: Generate App Password');
console.log('  → Go to: https://myaccount.google.com/apppasswords');
console.log('  → Select "Mail" from the dropdown');
console.log('  → Select "Other (Custom name)" or your device');
console.log('  → Enter name: "CoCo Store Backend"');
console.log('  → Click "Generate"');
console.log('  → You will see a 16-character password like:');
console.log('     "abcd efgh ijkl mnop"');
console.log('  → COPY THIS PASSWORD (you can only see it once!)');
console.log('');

console.log('Step 3: Update .env File');
console.log('  → Open file: Do-An-Tot-Nghiep-2025/BE/.env');
console.log('  → Find the line: EMAIL_PASSWORD=...');
console.log('  → Replace with: EMAIL_PASSWORD=abcdefghijklmnop');
console.log('     (Remove all spaces from the App Password)');
console.log('  → Example:');
console.log('     OLD: EMAIL_PASSWORD=your-regular-password');
console.log('     NEW: EMAIL_PASSWORD=abcdefghijklmnop');
console.log('  → Save the file');
console.log('');

console.log('Step 4: Verify Configuration');
console.log('  → Run: node Scripts/check-email-config.js');
console.log('  → You should see: ✅ Email service connection verified successfully!');
console.log('');

console.log('Step 5: Restart Server');
console.log('  → Stop the server (Ctrl+C)');
console.log('  → Run: npm start');
console.log('  → Check logs for: ✅ Email service verified and ready');
console.log('');

console.log('========================================');
console.log('✅ After completing these steps:');
console.log('   - Email OTP will be sent successfully');
console.log('   - Customers will receive OTP codes');
console.log('   - Registration workflow will work correctly');
console.log('========================================\n');

// Additional tips
console.log('💡 IMPORTANT NOTES:');
console.log('   • App Password is different from your Gmail password');
console.log('   • App Password is 16 characters (letters only, no numbers)');
console.log('   • Remove spaces when pasting into .env');
console.log('   • Never share your App Password');
console.log('   • You can generate multiple App Passwords for different apps');
console.log('   • If you lose the App Password, generate a new one');
console.log('');

