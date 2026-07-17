const axios = require('axios');

const API_BASE = 'http://localhost:5000/api/v1';

async function testLogin() {
  try {
    console.log('🧪 Testing student login...\n');
    
    const testEmail = 'student2020001@test.com';
    const testPassword = 'Test@123';
    
    console.log(`Attempting login with:`);
    console.log(`  Email: ${testEmail}`);
    console.log(`  Password: ${testPassword}\n`);
    
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: testEmail,
      password: testPassword
    });
    
    console.log('✅ Login successful!');
    console.log(`Token: ${response.data.data.accessToken.substring(0, 50)}...`);
    console.log(`User:`, response.data.data.user);
    
  } catch (error) {
    console.error('❌ Login failed!');
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data || error.message);
  }
}

testLogin();
