const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/csedu-nexus')
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

const { Member } = require('../src/models/Member');

async function debugEcExperience() {
  try {
    // Find the member by student ID
    const member = await Member.findOne({ studentId: '2021911202' });
    
    if (!member) {
      console.log('❌ Member not found');
      return;
    }

    console.log('\n📋 Member Info:');
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
      console.log('    Term ID:', exp.termId);
      console.log('    Raw:', JSON.stringify(exp, null, 2));
    });

    // Calculate EC years using the same logic
    const entries = member.ecExperience || [];
    const uniqueYears = new Set();
    
    console.log('\n🔢 Calculating EC Years:');
    for (const exp of entries) {
      const startDate = exp.startDate || exp.startsOn;
      const endDate = exp.endDate || exp.endsOn || (exp.isCurrent ? new Date() : null);
      
      console.log(`\n  Processing "${exp.postName}":`);
      console.log('    Start Date:', startDate);
      console.log('    End Date:', endDate);
      
      if (!startDate) {
        console.log('    ⚠️ Skipped: No start date');
        continue;
      }
      
      const start = new Date(startDate);
      const end = endDate ? new Date(endDate) : new Date();
      
      console.log('    Parsed Start:', start);
      console.log('    Parsed End:', end);
      
      const startYear = start.getFullYear();
      const endYear = end.getFullYear();
      
      console.log('    Start Year:', startYear);
      console.log('    End Year:', endYear);
      
      for (let year = startYear; year <= endYear; year++) {
        uniqueYears.add(year);
        console.log(`      Added year: ${year}`);
      }
    }
    
    console.log('\n✅ Total EC Years:', uniqueYears.size);
    console.log('   Unique Years:', Array.from(uniqueYears).sort());
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

debugEcExperience();
