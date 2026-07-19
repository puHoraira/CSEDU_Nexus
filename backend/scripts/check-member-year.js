require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const { Member } = require('../src/models/Member');
const { User } = require('../src/models/User');

async function checkMemberYear() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find the member with ID from the screenshot
    const memberId = '6a40ef0f9f9477fc185c9e47';
    
    const member = await Member.findById(memberId).populate('userId', 'firstName lastName email studentId');

    if (!member) {
      console.log('❌ Member not found');
      return;
    }

    console.log('\n📊 Member Details:');
    console.log('ID:', member._id);
    console.log('Name:', member.userId?.firstName, member.userId?.lastName);
    console.log('Student ID:', member.studentId || member.userId?.studentId);
    console.log('Batch:', member.batch);
    console.log('Current Year:', member.currentYear);
    console.log('Academic Year Level:', member.academicYearLevel);
    
    console.log('\n🎓 EC Experience:');
    console.log('EC Experience Array:', member.ecExperience);
    console.log('EC Years (calculated):', member.ecExperience?.length || 0);

    console.log('\n📅 Dates:');
    console.log('Joined On:', member.joinedOn);
    console.log('Created At:', member.createdAt);

    // Check if there's a mismatch
    if (member.currentYear === 1) {
      console.log('\n⚠️  WARNING: Member currentYear is 1, but might be displayed differently in UI');
      
      // Calculate expected year based on batch
      const currentDate = new Date();
      const currentYearNum = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1; // 0-indexed
      
      // Assuming academic year starts in September (month 9)
      const academicYear = currentMonth >= 9 ? currentYearNum : currentYearNum - 1;
      
      const expectedYear = academicYear - member.batch + 1;
      console.log(`   Expected year based on batch ${member.batch}: ${expectedYear}`);
      console.log(`   (Current academic year: ${academicYear})`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
}

checkMemberYear();
