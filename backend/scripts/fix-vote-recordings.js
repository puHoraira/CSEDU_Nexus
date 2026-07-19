require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const { VoteRecording } = require('../src/models/VoteRecording');
const { Election } = require('../src/models/Election');
const { Member } = require('../src/models/Member');
const { User } = require('../src/models/User');

async function fixVoteRecordings() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all vote recordings with raw election IDs
    const recordings = await VoteRecording.find().lean();
    
    console.log(`📊 Total Vote Recordings: ${recordings.length}\n`);

    for (const rec of recordings) {
      console.log(`\n📹 Recording ID: ${rec._id}`);
      console.log(`   Election ID (raw): ${rec.electionId}`);
      console.log(`   Voter ID: ${rec.voterId}`);
      console.log(`   Video URL: ${rec.secureUrl}`);
      console.log(`   Uploaded: ${new Date(rec.uploadedAt).toLocaleString()}`);
      
      // Check if election exists
      const election = await Election.findById(rec.electionId);
      if (election) {
        console.log(`   ✅ Election Found: ${election.name}`);
      } else {
        console.log(`   ❌ Election NOT Found (deleted or invalid ID)`);
        
        // Get all elections to suggest reassignment
        const allElections = await Election.find().select('name status').lean();
        if (allElections.length > 0) {
          console.log(`\n   💡 Available elections to reassign:`);
          allElections.forEach((e, idx) => {
            console.log(`      ${idx + 1}. ${e.name} (${e.status}) - ID: ${e._id}`);
          });
          
          // Auto-reassign to first active or latest election
          const targetElection = allElections.find(e => 
            e.status.includes('Active')
          ) || allElections[0];
          
          console.log(`\n   🔄 Would you like to reassign this video to: ${targetElection.name}?`);
          console.log(`   Run this command to reassign:`);
          console.log(`   db.voterecordings.updateOne({_id: ObjectId("${rec._id}")}, {$set: {electionId: ObjectId("${targetElection._id}")}})`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n\n✅ Disconnected from MongoDB');
  }
}

fixVoteRecordings();
