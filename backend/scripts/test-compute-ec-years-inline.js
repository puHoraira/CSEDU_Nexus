require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const { Member } = require('../src/models/Member');

// Inline copy of computeEcYears to test
function computeEcYears(member) {
  console.log('\n🚨 INLINE computeEcYears CALLED 🚨');
  console.log('🔢 Starting calculation for member:', member.studentId);
  console.log('🔢 EC Experience array:', JSON.stringify(member.ecExperience, null, 2));
  
  const entries = member.ecExperience || [];
  console.log('🔢 Number of entries:', entries.length);
  
  if (entries.length === 0) {
    console.log('🔢 No entries found, returning 0');
    return 0;
  }
  
  const uniqueYears = new Set();
  
  for (const exp of entries) {
    console.log('🔢 Processing entry:', exp.postName);
    
    const startDate = exp.startDate || exp.startsOn;
    const endDate = exp.endDate || exp.endsOn || (exp.isCurrent ? new Date() : null);
    
    console.log('🔢   startDate:', startDate);
    console.log('🔢   endDate:', endDate);
    
    if (!startDate) {
      console.log('🔢   ⚠️  No start date, skipping');
      continue;
    }
    
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    
    const startYear = start.getFullYear();
    const endYear = end.getFullYear();
    
    console.log(`🔢   Years range: ${startYear} to ${endYear}`);
    
    for (let year = startYear; year <= endYear; year++) {
      uniqueYears.add(year);
      console.log('🔢     Added year:', year);
    }
  }
  
  console.log('🔢 Unique years collected:', Array.from(uniqueYears).sort());
  console.log('🔢 Final result:', uniqueYears.size);
  
  return uniqueYears.size;
}

async function test() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const memberId = '6a40ef0f9f9477fc185c9e47';
    const member = await Member.findById(memberId);

    if (!member) {
      console.error('❌ Member not found');
      process.exit(1);
    }

    console.log('📝 Testing INLINE computeEcYears function:\n');
    const result = computeEcYears(member);
    
    console.log('\n✅ INLINE RESULT:', result);

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

test();
