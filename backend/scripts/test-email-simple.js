const path = require('path');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');

// Load environment variables
const envPath = path.resolve(__dirname, '../.env');
console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });

console.log('\n=== EMAIL TEST SCRIPT ===\n');

console.log('Environment Variables:');
console.log('SMTP_HOST:', process.env.SMTP_HOST);
console.log('SMTP_PORT:', process.env.SMTP_PORT);
console.log('SMTP_SECURE:', process.env.SMTP_SECURE);
console.log('SMTP_USER:', process.env.SMTP_USER);
console.log('SMTP_PASS:', process.env.SMTP_PASS ? '***SET***' : 'NOT SET');
console.log('SMTP_FROM:', process.env.SMTP_FROM);
console.log('');

async function testEmail() {
  try {
    console.log('Creating transporter...');
    
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS.replace(/"/g, '') // Remove quotes if present
      }
    });

    console.log('Verifying connection...');
    await transporter.verify();
    console.log('✅ Connection verified!\n');

    console.log('Sending test email...');
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: process.env.SMTP_USER, // Send to yourself for testing
      subject: 'Test Email from CSEDU Nexus',
      text: 'This is a test email to verify email sending functionality.',
      html: '<h1>Test Email</h1><p>This is a test email to verify email sending functionality.</p>'
    });

    console.log('✅ Email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
    console.log('\n✨ Email test PASSED!\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Email test FAILED!\n');
    console.error('Error:', error.message);
    console.error('');
    
    if (error.code) console.error('Code:', error.code);
    if (error.command) console.error('Command:', error.command);
    if (error.responseCode) console.error('Response Code:', error.responseCode);
    console.error('');
    
    process.exit(1);
  }
}

testEmail();
