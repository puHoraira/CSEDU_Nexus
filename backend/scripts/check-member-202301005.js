/**
 * Check Member 202301005 Database Structure
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Member = require('../src/models/Member');

async function checkMember() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const member = await Member.findOne({ studentId: '202301005' });
    
    if (!member) {
      console.log('❌ Member not found');
      return;
    }

    console.log('\n📋 Member Found:', member.studentId);
    console.log('📋 Member ID:', member._id);
    console.log('\n🔍 FULL MEMBER OBJECT:');
    console.log(JSON.stringify(member.toObject(), null, 2));

    console.log('\n🔍 Checking specific fields:');
    console.log('member.cgpa:', member.cgpa);
    console.log('member.academicRecord:', member.academicRecord);
    console.log('member.academicRecord?.currentCgpa:', member.academicRecord?.currentCgpa);
    console.log('member.attendanceRecord:', member.attendanceRecord);
    console.log('member.attendanceRecord?.overallAttendancePercentage:', member.attendanceRecord?.overallAttendancePercentage);
    console.log('member.disciplinaryRecord:', member.disciplinaryRecord);
    console.log('member.disciplinaryRecord?.totalActions:', member.disciplinaryRecord?.totalActions);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

checkMember();
