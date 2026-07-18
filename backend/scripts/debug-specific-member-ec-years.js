require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const { Member } = require('../src/models/Member');

async function debugSpecificMember() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const memberId = '6a40ef0f9f9477fc185c9e47';
    const member = await Member.findById(memberId);

    if (!member) {
      console.error('❌ Member not found');
      process.exit(1);
    }

    console.log('👤 Member Info:');
    console.log('  Student ID:', member.studentId);
    console.log('  Current Year:', member.currentYear);
    console.log('  EC Experience Entries:', member.ecExperience?.length || 0);
    
    console.log('\n📊 EC Experience Details:');
    member.ecExperience?.forEach((exp, idx) => {
      console.log(`\n  Entry #${idx + 1}:`);
      console.log('    Post Name:', exp.postName);
      console.log('    Start Date:', exp.startDate);
      console.log('    End Date:', exp.endDate);
      console.log('    Is Current:', exp.isCurrent);
    });

    // Test EnhancedElectionService.computeEcYears logic
    console.log('\n🔢 Calculating EC Years (Unique Calendar Years Method):');
    const entries = member.ecExperience || [];
    const uniqueYears = new Set();
    
    for (const exp of entries) {
      const startDate = exp.startDate || exp.startsOn;
      const endDate = exp.endDate || exp.endsOn || (exp.isCurrent ? new Date() : null);
      
      console.log(`\n  Processing "${exp.postName}":`);
      console.log('    startDate:', startDate);
      console.log('    endDate:', endDate);
      
      if (!startDate) {
        console.log('    ⚠️ No start date, skipping');
        continue;
      }
      
      const start = new Date(startDate);
      const end = endDate ? new Date(endDate) : new Date();
      
      const startYear = start.getFullYear();
      const endYear = end.getFullYear();
      
      console.log(`    Years range: ${startYear} to ${endYear}`);
      
      for (let year = startYear; year <= endYear; year++) {
        uniqueYears.add(year);
        console.log(`      - Added year: ${year}`);
      }
    }
    
    console.log('\n✅ Unique Years Collected:', Array.from(uniqueYears).sort());
    console.log('✅ Total EC Years:', uniqueYears.size);

    // Test ElectionService.computeEcYears logic (duration-based)
    console.log('\n🔢 Calculating EC Years (Duration Method):');
    let totalMs = 0;
    const now = Date.now();
    
    for (const e of entries) {
      if (!e.startDate) continue;
      const start = new Date(e.startDate).getTime();
      const end = e.endDate ? new Date(e.endDate).getTime() : now;
      if (end > start) {
        const duration = end - start;
        totalMs += duration;
        console.log(`  ${e.postName}: ${(duration / (365.25 * 24 * 60 * 60 * 1000)).toFixed(2)} years`);
      }
    }
    
    const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;
    const durationYears = Math.floor(totalMs / YEAR_MS);
    console.log('✅ Total Duration Years:', durationYears);

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

debugSpecificMember();
