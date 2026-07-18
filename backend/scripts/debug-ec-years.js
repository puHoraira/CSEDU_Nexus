require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const { Member } = require('../src/models/Member');

async function debugEcYears() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const studentId = '2021911202';
    const member = await Member.findOne({ studentId });

    if (!member) {
      console.error('❌ Member not found');
      process.exit(1);
    }

    console.log('\n📋 Member Data:');
    console.log('Student ID:', member.studentId);
    console.log('Current Year:', member.currentYear);
    console.log('EC Experience Count:', member.ecExperience?.length || 0);
    console.log('\n🔍 EC Experience Details:');
    member.ecExperience?.forEach((exp, idx) => {
      console.log(`\n  Entry ${idx + 1}:`);
      console.log('    Post Name:', exp.postName);
      console.log('    Start Date:', exp.startDate);
      console.log('    End Date:', exp.endDate);
      console.log('    Is Current:', exp.isCurrent);
      console.log('    Term ID:', exp.termId);
    });

    // Manual calculation
    const entries = member.ecExperience || [];
    const uniqueYears = new Set();
    
    for (const exp of entries) {
      const startDate = exp.startDate || exp.startsOn;
      const endDate = exp.endDate || exp.endsOn || (exp.isCurrent ? new Date() : null);
      
      if (!startDate) {
        console.log(`\n⚠️  Skipping entry "${exp.postName}" - no start date`);
        continue;
      }
      
      const start = new Date(startDate);
      const end = endDate ? new Date(endDate) : new Date();
      
      const startYear = start.getFullYear();
      const endYear = end.getFullYear();
      
      console.log(`\n  📅 Entry "${exp.postName}":`);
      console.log(`     Start: ${start.toISOString()} (Year ${startYear})`);
      console.log(`     End:   ${end.toISOString()} (Year ${endYear})`);
      console.log(`     Years covered: ${startYear} to ${endYear}`);
      
      for (let year = startYear; year <= endYear; year++) {
        uniqueYears.add(year);
        console.log(`       Added year: ${year}`);
      }
    }
    
    console.log('\n✅ Calculation Result:');
    console.log('Unique Years:', Array.from(uniqueYears).sort());
    console.log('Total EC Years:', uniqueYears.size);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

debugEcYears();
