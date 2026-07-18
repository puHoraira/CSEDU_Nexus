require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

async function checkAllCandidates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const { ElectionCandidate } = require('../src/models/ElectionCandidate');
    const { Election } = require('../src/models/Election');
    const { Member } = require('../src/models/Member');

    // Get all elections
    const elections = await Election.find().sort({ createdAt: -1 }).limit(5);
    console.log(`\n📊 Found ${elections.length} elections`);

    for (const election of elections) {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`Election: ${election.name}`);
      console.log(`ID: ${election._id}`);
      console.log(`Phase: ${election.currentPhase}`);
      console.log(`Status: ${election.status}`);

      const candidates = await ElectionCandidate.find({ electionId: election._id });

      console.log(`Candidates: ${candidates.length}`);
      
      if (candidates.length > 0) {
        const byPhase = candidates.reduce((acc, c) => {
          const phase = c.phase || 'no-phase';
          acc[phase] = (acc[phase] || 0) + 1;
          return acc;
        }, {});
        console.log('By phase:', byPhase);

        console.log('\nCandidate details (raw):');
        for (const c of candidates) {
          console.log(`  - MemberID: ${c.memberId} | Phase ${c.phase || '?'} | PostID: ${c.postId || 'none'} | Status: ${c.status}`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

checkAllCandidates();
