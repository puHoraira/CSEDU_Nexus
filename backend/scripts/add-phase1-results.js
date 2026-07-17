/**
 * Calculate and add Phase 1 results to the election
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
    
    const Election = mongoose.connection.collection('elections');
    const Member = mongoose.connection.collection('members');
    const ElectionCandidate = mongoose.connection.collection('electioncandidates');
    const ElectionVote = mongoose.connection.collection('electionvotes');
    
    const electionObjId = new mongoose.Types.ObjectId(ELECTION_ID);
    
    console.log('📋 Calculating Phase 1 results...\n');
    
    // Get Phase 1 candidates
    const phase1Candidates = await ElectionCandidate.find({ 
      electionId: electionObjId,
      $or: [
        { postId: { $exists: false } },
        { postId: null },
        { phase: 1 }
      ]
    }).toArray();
    
    console.log(`Found ${phase1Candidates.length} Phase 1 candidates`);
    
    // Get Phase 1 votes
    const phase1Votes = await ElectionVote.find({
      electionId: electionObjId,
      phase: 1
    }).toArray();
    
    console.log(`Found ${phase1Votes.length} Phase 1 votes\n`);
    
    // Group candidates by batch
    const candidatesByBatch = {};
    for (const candidate of phase1Candidates) {
      const member = await Member.findOne({ _id: candidate.memberId });
      if (member) {
        const batch = member.batch;
        if (!candidatesByBatch[batch]) candidatesByBatch[batch] = [];
        candidatesByBatch[batch].push({
          candidate,
          member,
          batch
        });
      }
    }
    
    // Calculate votes for each candidate
    const voteCounts = {};
    phase1Votes.forEach(vote => {
      const cId = vote.candidateId.toString();
      voteCounts[cId] = (voteCounts[cId] || 0) + 1;
    });
    
    // Build Phase 1 results grouped by batch
    const phase1Results = [];
    
    for (const [batch, candidates] of Object.entries(candidatesByBatch)) {
      console.log(`Batch ${batch}:`);
      
      const batchResults = candidates.map(c => {
        const votes = voteCounts[c.candidate._id.toString()] || 0;
        const batchVotes = phase1Votes.filter(v => {
          const cand = candidates.find(x => x.candidate._id.toString() === v.candidateId.toString());
          return cand !== undefined;
        }).length;
        
        return {
          batch: parseInt(batch),
          batchLabel: `Batch ${batch}`,
          candidateId: c.candidate._id,
          memberId: c.member._id,
          studentId: c.member.studentId,
          name: `${c.member.studentId}`,
          votes,
          percentage: batchVotes > 0 ? ((votes / batchVotes) * 100).toFixed(2) : 0,
          rank: 0 // Will be set after sorting
        };
      }).sort((a, b) => b.votes - a.votes);
      
      // Assign ranks
      batchResults.forEach((r, i) => {
        r.rank = i + 1;
        phase1Results.push(r);
        console.log(`  ${r.rank}. ${r.studentId}: ${r.votes} votes (${r.percentage}%)`);
      });
      
      console.log('');
    }
    
    // Update election with Phase 1 results
    await Election.updateOne(
      { _id: electionObjId },
      { 
        $set: { 
          'results.phase1': phase1Results,
          'results.phase1PublishedAt': new Date(),
          updatedAt: new Date()
        } 
      }
    );
    
    console.log('✅ Phase 1 results saved to database');
    console.log(`\n📊 Summary: ${phase1Results.length} candidates across ${Object.keys(candidatesByBatch).length} batches`);
    
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
