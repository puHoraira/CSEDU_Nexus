require('dotenv').config();
require('../src/config/db');
const { Election } = require('../src/models/Election');

async function updateElection() {
  try {
    const mongoose = require('mongoose');
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('🔄 Updating "custom president" election...');
    
    const result = await Election.updateOne(
      { _id: '6a5b436d7aa159d962cfcc5a' },
      { 
        $set: { 
          skipPhase1: true,
          skipPhase2: false,
        } 
      }
    );
    
    console.log('✅ Update result:', result);
    
    // Verify
    const updated = await Election.findById('6a5b436d7aa159d962cfcc5a')
      .select('name skipPhase1 skipPhase2')
      .lean();
    
    console.log('\n✅ Verified election:', JSON.stringify(updated, null, 2));
    console.log('\n🎉 Done! Refresh your browser now.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

setTimeout(updateElection, 2000);
