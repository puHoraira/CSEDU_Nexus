require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

async function checkPhase2Candidates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const { ElectionCandidate } = require('../src/models/ElectionCandidate');
    const { Election } = require('../src/models/Election');

    // Find the most recent election
    const election = await Election.findOne().sort({ createdAt: -1 });
    if (!election) {
      console.log('❌ No elections found');
      return;
    }

    console.log('\n📊 Election:', election.name);
    console.log('Current Phase:', election.currentPhase);
    console.log('Election ID:', election._id);

    // Count all candidates
    const allCandidates = await ElectionCandidate.find({ electionId: election._id });
    console.log('\n📋 Total candidates:', allCandidates.length);

    // Group by phase
    const phase1 = allCandidates.filter(c => c.phase === 1);
    const phase2 = allCandidates.filter(c => c.phase === 2);
    const noPhase = allCandidates.filter(c => !c.phase);

    console.log('Phase 1 candidates:', phase1.length);
    console.log('Phase 2 candidates:', phase2.length);
    console.log('No phase set:', noPhase.length);

    // Show Phase 2 candidates detail
    if (phase2.length > 0) {
      console.log('\n✅ Phase 2 Candidates Found:');
      for (const candidate of phase2) {
        await candidate.populate('memberId', 'studentId batch currentYear userId');
        await candidate.populate('memberId.userId', 'firstName lastName');
        await candidate.populate('postId', 'title code');
        
        const name = candidate.memberId?.userId 
          ? `${candidate.memberId.userId.firstName} ${candidate.memberId.userId.lastName}`
          : 'Unknown';
        
        console.log(`  - ${name} (${candidate.memberId?.studentId}) → ${candidate.postId?.title || 'No post'} [${candidate.status}]`);
      }
    } else {
      console.log('\n❌ No Phase 2 candidates found in database');
    }

    // Show sample candidate structure
    if (allCandidates.length > 0) {
      console.log('\n📝 Sample candidate structure:');
      const sample = allCandidates[0];
      console.log(JSON.stringify({
        _id: sample._id,
        electionId: sample.electionId,
        memberId: sample.memberId,
        postId: sample.postId,
        phase: sample.phase,
        status: sample.status,
        batch: sample.batch,
      }, null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

checkPhase2Candidates();
