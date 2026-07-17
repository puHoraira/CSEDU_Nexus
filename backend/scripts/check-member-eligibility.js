/**
 * Quick script to check member eligibility
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { Member } = require('../src/models/Member');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/iplab';

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');
  
  const members = await Member.find({
    studentId: /^(2020|2021|2022|2023)0(0[1-9]|10)$/
  }).select('studentId batch academicRecord.currentCgpa attendanceRecord.overallAttendancePercentage disciplinaryRecord.totalActions');
  
  console.log(`Found ${members.length} test members:\n`);
  
  const eligible = members.filter(m => 
    (m.academicRecord?.currentCgpa || 0) >= 3.5 && 
    (m.attendanceRecord?.overallAttendancePercentage || 0) >= 75 && 
    (m.disciplinaryRecord?.totalActions || 0) === 0
  );
  
  console.log('Sample members:');
  members.slice(0, 10).forEach(m => {
    console.log(`  ${m.studentId} (Batch ${m.batch}): CGPA=${m.academicRecord?.currentCgpa || 'N/A'}, Attendance=${m.attendanceRecord?.overallAttendancePercentage || 'N/A'}%, Disciplinary=${m.disciplinaryRecord?.totalActions || 0}`);
  });
  
  console.log(`\n✅ Eligible members: ${eligible.length}/${members.length}`);
  console.log(`❌ Ineligible members: ${members.length - eligible.length}/${members.length}`);
  
  // Group by batch
  const batchGroups = {};
  for (const member of eligible) {
    if (!batchGroups[member.batch]) batchGroups[member.batch] = 0;
    batchGroups[member.batch]++;
  }
  
  console.log('\nEligible members by batch:');
  Object.entries(batchGroups).forEach(([batch, count]) => {
    console.log(`  Batch ${batch}: ${count} eligible`);
  });
  
  await mongoose.connection.close();
}

main().catch(console.error);
