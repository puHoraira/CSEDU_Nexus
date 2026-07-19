/**
 * Email Service Test Script
 * 
 * Tests email sending functionality with various scenarios:
 * 1. Basic test email
 * 2. Verification email simulation
 * 3. Password reset email simulation
 * 
 * Usage: node scripts/test-email.js
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { EmailService } = require('../src/services/EmailService');

async function testEmailService() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('📧 EMAIL SERVICE TEST');
  console.log('═══════════════════════════════════════════════════\n');

  console.log('Environment Configuration:');
  console.log('├─ NODE_ENV:', process.env.NODE_ENV);
  console.log('├─ SMTP_HOST:', process.env.SMTP_HOST);
  console.log('├─ SMTP_PORT:', process.env.SMTP_PORT);
  console.log('├─ SMTP_SECURE:', process.env.SMTP_SECURE);
  console.log('├─ SMTP_USER:', process.env.SMTP_USER);
  console.log('├─ SMTP_PASS:', process.env.SMTP_PASS ? '***CONFIGURED***' : 'NOT SET');
  console.log('├─ SMTP_FROM:', process.env.SMTP_FROM);
  console.log('└─ FRONTEND_URL:', process.env.FRONTEND_URL);
  console.log('');

  // Test user data
  const testUser = {
    firstName: 'Test',
    lastName: 'User',
    email: process.env.TEST_EMAIL || 'abuhoraira1015@gmail.com', // Use same email as sender for testing
    studentId: '2024999999'
  };

  console.log('Test User:');
  console.log('├─ Name:', `${testUser.firstName} ${testUser.lastName}`);
  console.log('├─ Email:', testUser.email);
  console.log('└─ Student ID:', testUser.studentId);
  console.log('');

  try {
    // Initialize email service
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Step 1: Initializing Email Service...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    await EmailService.initialize();
    console.log('✅ Email service initialized successfully!\n');

    // Test 1: Send verification email
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Step 2: Testing Verification Email...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const verificationToken = EmailService.generateVerificationToken();
    console.log('Generated Token:', verificationToken.token.substring(0, 20) + '...');
    console.log('Token Expires:', verificationToken.expires);
    console.log('');

    const verificationResult = await EmailService.sendVerificationEmail(
      testUser,
      verificationToken.token
    );

    console.log('✅ Verification email sent successfully!');
    console.log('├─ Message ID:', verificationResult.messageId);
    if (verificationResult.previewUrl) {
      console.log('├─ Preview URL:', verificationResult.previewUrl);
    }
    if (verificationResult.verificationUrl) {
      console.log('└─ Verification URL:', verificationResult.verificationUrl);
    }
    console.log('');

    // Test 2: Send password reset email
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Step 3: Testing Password Reset Email...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const resetToken = EmailService.generatePasswordResetToken();
    console.log('Generated Token:', resetToken.token.substring(0, 20) + '...');
    console.log('Token Expires:', resetToken.expires);
    console.log('');

    const resetResult = await EmailService.sendPasswordResetEmail(
      testUser,
      resetToken.token
    );

    console.log('✅ Password reset email sent successfully!');
    console.log('├─ Message ID:', resetResult.messageId);
    if (resetResult.previewUrl) {
      console.log('├─ Preview URL:', resetResult.previewUrl);
    }
    if (resetResult.resetUrl) {
      console.log('└─ Reset URL:', resetResult.resetUrl);
    }
    console.log('');

    // Test 3: Send welcome email
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Step 4: Testing Welcome Email...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const welcomeResult = await EmailService.sendWelcomeEmail(testUser);

    console.log('✅ Welcome email sent successfully!');
    console.log('└─ Message ID:', welcomeResult.messageId);
    console.log('');

    // Summary
    console.log('═══════════════════════════════════════════════════');
    console.log('✨ ALL TESTS PASSED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════════\n');
    
    console.log('Summary:');
    console.log('├─ ✅ Email service initialization: SUCCESS');
    console.log('├─ ✅ Verification email: SUCCESS');
    console.log('├─ ✅ Password reset email: SUCCESS');
    console.log('└─ ✅ Welcome email: SUCCESS');
    console.log('');
    
    console.log('📬 Check your inbox at:', testUser.email);
    console.log('   (Check spam folder if emails not in inbox)');
    console.log('');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ EMAIL TEST FAILED!\n');
    console.error('Error:', error.message);
    console.error('');
    
    if (error.code) {
      console.error('Error Code:', error.code);
    }
    
    if (error.command) {
      console.error('Failed Command:', error.command);
    }
    
    if (error.response) {
      console.error('Server Response:', error.response);
    }
    
    console.error('\nFull Error:', error);
    console.error('');

    console.log('═══════════════════════════════════════════════════');
    console.log('🔍 TROUBLESHOOTING TIPS');
    console.log('═══════════════════════════════════════════════════\n');
    
    console.log('1. Check SMTP credentials in .env file:');
    console.log('   ├─ SMTP_USER should be your full Gmail address');
    console.log('   ├─ SMTP_PASS should be an App Password (not regular password)');
    console.log('   └─ SMTP_HOST should be smtp.gmail.com');
    console.log('');
    
    console.log('2. Generate Gmail App Password:');
    console.log('   ├─ Go to: https://myaccount.google.com/apppasswords');
    console.log('   ├─ Sign in with your Google account');
    console.log('   ├─ Create new app password for "Mail"');
    console.log('   └─ Copy the 16-character password to SMTP_PASS');
    console.log('');
    
    console.log('3. Gmail Security Settings:');
    console.log('   ├─ Ensure 2-Step Verification is enabled');
    console.log('   ├─ Check "Less secure app access" is NOT needed (use App Password)');
    console.log('   └─ Verify account is not locked or restricted');
    console.log('');
    
    console.log('4. Check .env file format:');
    console.log('   ├─ No spaces around = sign');
    console.log('   ├─ Use quotes if password contains special characters');
    console.log('   └─ Example: SMTP_PASS="your app password here"');
    console.log('');

    process.exit(1);
  }
}

// Run the test
console.log('Starting email service test...\n');
testEmailService();
