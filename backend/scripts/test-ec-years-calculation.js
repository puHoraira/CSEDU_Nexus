require('dotenv').config();
const mongoose = require('mongoose');
const { Member } = require('../src/models/Member');

// Force clear require cache to ensure we're using the latest code
delete require.cache[require.resolve('../src/services/EnhancedElectionService')];

const { EnhancedElectionService } = require('../src/services/EnhancedElectionService');

console.log('\n🔧 VERIFY: EnhancedElectionService loaded from:', require.resolve('../src/services/EnhancedElectionService'));
console.log('🔧 VERIFY: getEligiblePostsForMember exists?', typeof EnhancedElectionService.getEligiblePostsForMember);
console.log('🔧 VERIFY: computeEcYears exists?', typeof EnhancedElectionService.computeEcYears);

async function testEcYearsCalculation() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const memberId = '6a40ef0f9f9477fc185c9e47'; // Replace with your test member ID
    const electionId = '6792c4caa82f9bc04ad63bc4'; // Replace with your test election ID

    console.log('🔍 Fetching member directly from DB...');
    const member = await Member.findById(memberId);
    
    if (!member) {
      console.error('❌ Member not found!');
      process.exit(1);
    }

    console.log('\n📋 Member Data:');
    console.log('  Student ID:', member.studentId);
    console.log('  Current Year:', member.currentYear);
    console.log('  EC Experience Entries:', member.ecExperience?.length || 0);
    console.log('\n  EC Experience Details:');
    member.ecExperience?.forEach((exp, idx) => {
      console.log(`    ${idx + 1}. ${exp.postName}`);
      console.log(`       Start: ${exp.startDate}`);
      console.log(`       End: ${exp.endDate || 'current'}`);
    });

    console.log('\n🧮 Calling EnhancedElectionService.computeEcYears...\n');
    const ecYears = EnhancedElectionService.computeEcYears(member);
    
    console.log('\n✅ RESULT:', ecYears, 'years');

    console.log('\n🔍 Now testing getEligiblePostsForMember...\n');
    const result = await EnhancedElectionService.getEligiblePostsForMember(memberId, electionId);
    
    console.log('\n📊 Eligibility Result:');
    console.log('  Member EC Years:', result.member.ecYears);
    console.log('  Number of posts:', result.eligibility.length);
    
    await mongoose.disconnect();
    console.log('\n✅ Test completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testEcYearsCalculation();
