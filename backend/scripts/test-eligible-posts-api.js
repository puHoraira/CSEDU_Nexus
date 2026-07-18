require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

// Clear Node.js module cache for EnhancedElectionService
delete require.cache[require.resolve('../src/services/EnhancedElectionService')];

const mongoose = require('mongoose');
const { EnhancedElectionService } = require('../src/services/EnhancedElectionService');

async function testEligiblePostsAPI() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const memberId = '6a40ef0f9f9477fc185c9e47';
    // You'll need to provide a valid electionId - get one from your database
    const electionId = '6792c4caa82f9bc04ad63bc4'; // Replace with actual election ID

    console.log('📞 Calling EnhancedElectionService.getEligiblePostsForMember...\n');
    
    const result = await EnhancedElectionService.getEligiblePostsForMember(memberId, electionId);
    
    console.log('\n📊 RESULT:');
    console.log(JSON.stringify(result, null, 2));
    
    console.log('\n🔍 Member ecYears from result:', result.member.ecYears);

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testEligiblePostsAPI();
