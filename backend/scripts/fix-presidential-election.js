require('dotenv').config();
require('../src/config/db');
const { Election } = require('../src/models/Election');
const { EcPost } = require('../src/models/EcPost');

async function fixPresidentialElection() {
  try {
    console.log('🔄 Finding presidential elections...');
    
    // Find elections with "president" in the name
    const elections = await Election.find({ 
      name: { $regex: /president/i } 
    });
    
    if (elections.length === 0) {
      console.log('❌ No presidential elections found');
      return;
    }
    
    console.log(`✅ Found ${elections.length} election(s):`);
    elections.forEach(e => console.log(`  - ${e.name} (${e._id})`));
    
    // Find the President post
    const presidentPost = await EcPost.findOne({ code: 'PRESIDENT' });
    
    if (!presidentPost) {
      console.log('❌ President post not found in database');
      return;
    }
    
    console.log(`✅ Found President post: ${presidentPost.title} (${presidentPost._id})`);
    
    // Update each election to be Phase 2 only
    for (const election of elections) {
      console.log(`\n🔄 Updating ${election.name}...`);
      
      election.skipPhase1 = true;  // Skip Phase 1
      election.skipPhase2 = false; // Run Phase 2
      election.currentPhase = 2;   // Set to Phase 2
      
      // Set Phase 2 to include only President post
      if (!election.phase2) {
        election.phase2 = {};
      }
      election.phase2.includedPosts = [presidentPost._id];
      
      await election.save();
      
      console.log(`✅ Updated ${election.name}:`);
      console.log(`   skipPhase1: ${election.skipPhase1}`);
      console.log(`   skipPhase2: ${election.skipPhase2}`);
      console.log(`   currentPhase: ${election.currentPhase}`);
      console.log(`   includedPosts: ${election.phase2.includedPosts.length} post(s)`);
    }
    
    console.log('\n✅ All done! Refresh your browser.');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Wait for DB connection
setTimeout(() => {
  fixPresidentialElection();
}, 2000);
