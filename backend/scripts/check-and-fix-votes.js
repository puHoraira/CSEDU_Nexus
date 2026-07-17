/**
 * Check and fix vote records
 */

const mongoose = require('mongoose');
const crypto = require('crypto');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/csedu';
const ELECTION_ID = '6a59d3a473c6d620655db9a5';

async function main() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');
    
    const electionObjId = new mongoose.Types.ObjectId(ELECTION_ID);
    
    // Check both collections
    const votes = mongoose.connection.collection('votes');
    const electionvotes = mongoose.connection.collection('electionvotes');
    
    console.log('📋 Checking vote collections...\n');
    
    const votesCount = await votes.countDocuments({ electionId: electionObjId });
    const electionvotesCount = await electionvotes.countDocuments({ electionId: electionObjId });
    
    console.log(`Votes in 'votes' collection: ${votesCount}`);
    console.log(`Votes in 'electionvotes' collection: ${electionvotesCount}\n`);
    
    if (electionvotesCount > 0 && votesCount === 0) {
      console.log('📦 Migrating votes from electionvotes to votes collection...\n');
      
      const oldVotes = await electionvotes.find({ electionId: electionObjId }).toArray();
      console.log(`Found ${oldVotes.length} votes to migrate`);
      
      const newVotes = [];
      
      for (const oldVote of oldVotes) {
        // Generate a unique hash for each vote
        const voteHash = crypto
          .createHash('sha256')
          .update(`${oldVote.electionId}-${oldVote.voterId || oldVote.voterMemberId}-${oldVote.candidateId}-${oldVote.phase}-${Date.now()}-${Math.random()}`)
          .digest('hex');
        
        newVotes.push({
          electionId: oldVote.electionId,
          voterMemberId: oldVote.voterId || oldVote.voterMemberId, // Use correct field name
          candidateId: oldVote.candidateId,
          phase: oldVote.phase || 1,
          postId: oldVote.postId || null,
          batch: oldVote.batch || null,
          voteHash,
          voterVerified: true,
          verificationMethod: 'Student_ID',
          castAt: oldVote.timestamp || oldVote.createdAt || new Date(),
          isValid: true,
          reviewStatus: 'Not_Reviewed',
          disputeRaised: false,
          createdAt: oldVote.createdAt || new Date(),
          updatedAt: oldVote.updatedAt || new Date()
        });
      }
      
      if (newVotes.length > 0) {
        // Insert in batches to avoid duplicate key errors
        let inserted = 0;
        for (const vote of newVotes) {
          try {
            await votes.insertOne(vote);
            inserted++;
            if (inserted % 50 === 0) {
              console.log(`  ${inserted} votes migrated...`);
            }
          } catch (error) {
            // Skip duplicates
            if (!error.message.includes('duplicate')) {
              console.log(`  ⚠️ Error inserting vote: ${error.message}`);
            }
          }
        }
        console.log(`\n✅ Migrated ${inserted} votes`);
      }
    } else if (votesCount > 0) {
      console.log('✅ Votes already in correct collection');
    } else {
      console.log('❌ No votes found in either collection!');
    }
    
    // Show final counts
    const finalVotesCount = await votes.countDocuments({ electionId: electionObjId });
    console.log(`\n📊 Final vote count: ${finalVotesCount}`);
    
    // Show breakdown by phase
    const phase1Count = await votes.countDocuments({ electionId: electionObjId, phase: 1 });
    const phase2Count = await votes.countDocuments({ electionId: electionObjId, phase: 2 });
    
    console.log(`  Phase 1: ${phase1Count} votes`);
    console.log(`  Phase 2: ${phase2Count} votes`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

main()
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
