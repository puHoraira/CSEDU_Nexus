require('dotenv').config();
const mongoose = require('mongoose');
const { Member } = require('../src/models/Member');

async function testMemberDirect() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const memberId = '6a40ef0f9f9477fc185c9e47';

    console.log('🔍 Fetching member directly...');
    const member = await Member.findById(memberId).lean();
    
    console.log('\n📋 Member Object Keys:');
    console.log(Object.keys(member));
    
    console.log('\n📋 Does member have "ecYears" field?:', 'ecYears' in member);
    console.log('📋 Value of member.ecYears:', member.ecYears);
    
    console.log('\n📋 Full member object:');
    console.log(JSON.stringify(member, null, 2));

    await mongoose.disconnect();
    console.log('\n✅ Test completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testMemberDirect();
