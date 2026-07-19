const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const { User } = require('../src/models/User');
const { Member } = require('../src/models/Member');

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/iplab';

console.log('🔗 Connecting to:', MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));

async function checkAndFixMember() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const studentId = '2021333999';
    
    console.log(`\n🔍 Searching for member with studentId: ${studentId}\n`);
    
    const member = await Member.findOne({ studentId }).populate('userId', 'firstName lastName email');
    
    if (!member) {
      console.error(`❌ Member not found with studentId: ${studentId}`);
      process.exit(1);
    }

    console.log('📋 CURRENT MEMBER DATA:');
    console.log('  _id:', member._id);
    console.log('  studentId:', member.studentId);
    console.log('  batch:', member.batch);
    console.log('  currentYear:', member.currentYear);
    console.log('  academicYearLevel:', member.academicYearLevel);
    console.log('  userId:', member.userId?._id);
    console.log('  userName:', member.userId?.firstName, member.userId?.lastName);
    console.log('  membershipStatus:', member.membershipStatus?.status);
    console.log('  ecExperience entries:', member.ecExperience?.length || 0);
    
    if (member.ecExperience && member.ecExperience.length > 0) {
      console.log('\n📌 EC Experience:');
      member.ecExperience.forEach((exp, index) => {
        console.log(`  ${index + 1}. ${exp.postName}`);
        console.log(`     Start: ${exp.startDate}`);
        console.log(`     End: ${exp.endDate || 'Current'}`);
        console.log(`     isCurrent: ${exp.isCurrent}`);
      });
    }

    console.log('\n⚠️  ISSUE DETECTED:');
    console.log(`  Frontend shows: Year 3`);
    console.log(`  Database currentYear: ${member.currentYear}`);
    console.log(`  Database academicYearLevel: ${member.academicYearLevel}`);
    
    // Determine correct year based on batch
    const currentYear = new Date().getFullYear();
    const batch = member.batch;
    
    // Batch 2021 students admitted in 2021
    // In 2025, they should be in 4th year
    // In 2026 (current), they should be in 5th year or graduated
    // But user says they're Year 3, so maybe batch 2023?
    
    let expectedYear;
    let expectedLevel;
    
    if (batch === 2021) {
      // Assuming session 2020-2021, admitted in 2021
      // 2021-2022: Year 1
      // 2022-2023: Year 2
      // 2023-2024: Year 3
      // 2024-2025: Year 4
      // 2025-2026: Year 5 or graduated
      const yearsSinceAdmission = currentYear - 2021;
      expectedYear = Math.min(yearsSinceAdmission + 1, 5);
    } else {
      // Calculate based on current year
      const yearsSinceAdmission = currentYear - batch;
      expectedYear = Math.min(yearsSinceAdmission + 1, 5);
    }
    
    const yearLevelMap = {
      1: 'First_Year',
      2: 'Second_Year',
      3: 'Third_Year',
      4: 'Fourth_Year',
      5: 'Masters'
    };
    
    expectedLevel = yearLevelMap[expectedYear] || 'First_Year';
    
    console.log(`\n📊 CALCULATION:`);
    console.log(`  Batch: ${batch}`);
    console.log(`  Current Year: ${currentYear}`);
    console.log(`  Years since admission: ${currentYear - batch}`);
    console.log(`  Expected currentYear: ${expectedYear}`);
    console.log(`  Expected academicYearLevel: ${expectedLevel}`);
    
    console.log('\n🔧 FIX OPTIONS:');
    console.log(`  Option 1: Set both fields to Year 3`);
    console.log(`    currentYear = 3`);
    console.log(`    academicYearLevel = "Third_Year"`);
    console.log(`  Option 2: Set both fields to calculated value (Year ${expectedYear})`);
    console.log(`    currentYear = ${expectedYear}`);
    console.log(`    academicYearLevel = "${expectedLevel}"`);
    
    // Apply fix (Option 1 - User says it's Year 3)
    const fixedYear = 3;
    const fixedLevel = 'Third_Year';
    
    console.log(`\n✅ Applying fix: Setting to Year 3...`);
    
    member.currentYear = fixedYear;
    member.academicYearLevel = fixedLevel;
    
    await member.save();
    
    console.log('✅ Member data updated successfully!');
    
    // Verify the update
    const updatedMember = await Member.findOne({ studentId });
    console.log('\n📋 UPDATED MEMBER DATA:');
    console.log('  currentYear:', updatedMember.currentYear);
    console.log('  academicYearLevel:', updatedMember.academicYearLevel);
    
    console.log('\n✅ Fix complete! Member can now apply for Executive Member posts.');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

checkAndFixMember();
