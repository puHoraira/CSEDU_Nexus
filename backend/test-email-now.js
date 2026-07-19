const nodemailer = require('nodemailer');

async function test() {
  console.log('Testing email with new app password...');
  console.log('Nodemailer version:', require('nodemailer/package.json').version);
  
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: 'abuhoraira1015@gmail.com',
        pass: 'mzunkpxelcrjteqq'
      }
    });

    console.log('Verifying connection...');
    await transporter.verify();
    console.log('✅ Connection verified!');
    
    console.log('Sending test email...');
    const result = await transporter.sendMail({
      from: 'abuhoraira1015@gmail.com',
      to: 'abuhoraira1015@gmail.com',
      subject: 'Test Email from CSEDU Nexus',
      text: 'This is a test email to verify email sending is working correctly.',
      html: '<h1>✅ Test Successful!</h1><p>Email sending is working correctly for CSEDU Nexus.</p>'
    });
    
    console.log('✅ Email sent successfully!');
    console.log('Message ID:', result.messageId);
    console.log('Response:', result.response);
    console.log('\n✨ Check your inbox at: abuhoraira1015@gmail.com\n');
  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.code) console.error('Error code:', err.code);
    if (err.stack) console.error('Stack:', err.stack);
  }
}

test();
