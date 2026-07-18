require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

async function findElection() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const { Election } = require('../src/models/Election');
    const { ElectionCandidate } = require('../src/models/ElectionCandidate');
    const { Member } = require('../src/models/Member');
    const { EcPost } = require('../src/models/EcPost');

    // Find elections that are in Phase 2
    const phase2Elections = await Election.find({ currentPhase: 2 }).sort({ createdAt: -1 });
    
    console.log(`\n📊 Found ${phase2Elections.length} Phase 2 elections\n`);

    for (const election of phase2Elections) {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`Election: ${election.name}`);
      console.log(`ID: ${election._id}`);
      console.log(`Status: ${election.status}`);
      console.log(`Current Phase: ${election.currentPhase}`);

      // Get candidates for this election
      const candidates = await ElectionCandidate.find({ electionId: election._id });
      const phase2Candidates = candidates.filter(c => c.phase === 2);
      
      console.log(`Total Candidates: ${candidates.length}`);
      console.log(`Phase 2 Candidates: ${phase2Candidates.length}`);
      
      if (phase2Candidates.length > 0) {
        console.log('\n✅ Phase 2 candidates:');
        for (const candidate of phase2Candidates) {
          const member = await Member.findById(candidate.memberId);
          const post = candidate.postId ? await EcPost.findById(candidate.postId) : null;
          
          console.log(`  - Member: ${member?.studentId || 'Unknown'}`);
          console.log(`    Post: ${post?.title || 'No post'}`);
          console.log(`    Status: ${candidate.status}`);
          console.log('');
        }
      } else {
        console.log('❌ No Phase 2 candidates found\n');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

findElection();
