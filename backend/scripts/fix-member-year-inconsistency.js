require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const { Member } = require('../src/models/Member');

const YEAR_MAPPING = {
  1: 'First_Year',
  2: 'Second_Year',
  3: 'Third_Year',
  4: 'Fourth_Year',
  5: 'Fifth_Year'
};

async function fixYearInconsistency() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find the specific member
    const memberId = '6a40ef0f9f9477fc185c9e47';
    
    const member = await Member.findById(memberId);

    if (!member) {
      console.log('❌ Member not found');
      return;
    }

    console.log('\n📊 Before Fix:');
    console.log('Current Year:', member.currentYear);
    console.log('Academic Year Level:', member.academicYearLevel);

    // Fix the academic year level to match current year
    const expectedLevel = YEAR_MAPPING[member.currentYear];
    
    if (member.academicYearLevel !== expectedLevel) {
      console.log(`\n🔧 Fixing inconsistency...`);
      console.log(`   Changing academicYearLevel from "${member.academicYearLevel}" to "${expectedLevel}"`);
      
      member.academicYearLevel = expectedLevel;
      await member.save();

      console.log('\n✅ Fixed!');
    } else {
      console.log('\n✅ No inconsistency found');
    }

    console.log('\n📊 After Fix:');
    console.log('Current Year:', member.currentYear);
    console.log('Academic Year Level:', member.academicYearLevel);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
}

fixYearInconsistency();
