/**
 * Quick Email Test Script
 * Tests if SMTP credentials are working
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmail() {
  console.log('🧪 Testing Email Configuration...\n');
  
  console.log('SMTP Settings:');
  console.log('- Host:', process.env.SMTP_HOST);
  console.log('- Port:', process.env.SMTP_PORT);
  console.log('- User:', process.env.SMTP_USER);
  console.log('- Pass:', process.env.SMTP_PASS ? '(set - ' + process.env.SMTP_PASS.length + ' chars)' : '(not set)');
  console.log('');

  try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    // Verify connection
    console.log('⏳ Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully!\n');

    // Send test email
    console.log('📧 Sending test email...');
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: process.env.SMTP_USER, // Send to yourself
      subject: 'Test Email from CSEDU Nexus',
      text: 'This is a test email to verify SMTP configuration.',
      html: '<h1>Test Email</h1><p>SMTP configuration is working correctly!</p>'
    });

    console.log('✅ Test email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('\n🎉 All tests passed! Email is working correctly.\n');

  } catch (error) {
    console.error('\n❌ Email test failed:');
    console.error('Error:', error.message);
    
    if (error.code === 'EAUTH') {
      console.error('\n💡 Authentication failed. Check:');
      console.error('   1. SMTP_USER is correct');
      console.error('   2. SMTP_PASS is correct (no quotes in .env file)');
      console.error('   3. Gmail "App Password" is enabled');
    }
    
    console.error('\n');
    process.exit(1);
  }
}

testEmail();
