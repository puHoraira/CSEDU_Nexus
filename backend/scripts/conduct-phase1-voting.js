/**
 * Conduct Phase 1 voting for existing election
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/csedu';
const ELECTION_ID = '6a59d3a473c6d620655db9a5';

async function main() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');
    
    const Member = mongoose.connection.collection('members');
    const ElectionCandidate = mongoose.connection.collection('electioncandidates');
    const ElectionVote = mongoose.connection.collection('electionvotes');
    
    const electionObjId = new mongoose.Types.ObjectId(ELECTION_ID);
    
    console.log('📋 Conducting Phase 1 voting...\n');
    
    // Get all active members
    const members = await Member.find({ status: 'Active' }).toArray();
    console.log(`Found ${members.length} active members`);
    
    // Get Phase 1 candidates
    const phase1Candidates = await ElectionCandidate.find({ 
      electionId: electionObjId,
      $or: [
        { postId: { $exists: false } },
        { postId: null },
        { phase: 1 }
      ],
      status: 'Approved'
    }).toArray();
    
    console.log(`Found ${phase1Candidates.length} approved Phase 1 candidates\n`);
    
    // Group candidates by batch
    const candidatesByBatch = {};
    for (const candidate of phase1Candidates) {
      const member = await Member.findOne({ _id: candidate.memberId });
      if (member) {
        const batch = member.batch;
        if (!candidatesByBatch[batch]) candidatesByBatch[batch] = [];
        candidatesByBatch[batch].push({
          ...candidate,
          batch
        });
      }
    }
    
    console.log('Batch distribution:');
    for (const [batch, candidates] of Object.entries(candidatesByBatch)) {
      console.log(`  Batch ${batch}: ${candidates.length} candidates`);
    }
    console.log('');
    
    // Each member votes for candidates in their own batch
    const votesToAdd = [];
    let voteCount = 0;
    
    for (const member of members) {
      const batch = member.batch;
      const batchCandidates = candidatesByBatch[batch] || [];
      
      if (batchCandidates.length === 0) {
        continue;
      }
      
      // Vote for 1-2 random candidates from their batch
      const numVotes = Math.min(2, batchCandidates.length);
      const shuffled = [...batchCandidates].sort(() => Math.random() - 0.5);
      const selectedCandidates = shuffled.slice(0, numVotes);
      
      for (const candidate of selectedCandidates) {
        votesToAdd.push({
          electionId: electionObjId,
          voterId: member._id,
          candidateId: candidate._id,
          phase: 1,
          batch: batch,
          timestamp: new Date(),
          createdAt: new Date()
        });
        
        voteCount++;
      }
      
      // Insert in batches
      if (votesToAdd.length >= 100) {
        await ElectionVote.insertMany(votesToAdd);
        console.log(`${voteCount} votes cast...`);
        votesToAdd.length = 0;
      }
    }
    
    // Insert remaining votes
    if (votesToAdd.length > 0) {
      await ElectionVote.insertMany(votesToAdd);
    }
    
    console.log(`\n✅ Phase 1 voting complete: ${voteCount} total votes cast`);
    
    // Show vote distribution by batch
    console.log('\nVote distribution by batch:');
    for (const [batch, candidates] of Object.entries(candidatesByBatch)) {
      const batchVotes = await ElectionVote.countDocuments({
        electionId: electionObjId,
        phase: 1,
        batch: parseInt(batch)
      });
      console.log(`  Batch ${batch}: ${batchVotes} votes`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

main()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
