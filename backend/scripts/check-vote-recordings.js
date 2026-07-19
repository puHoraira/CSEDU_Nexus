require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const { VoteRecording } = require('../src/models/VoteRecording');
const { Election } = require('../src/models/Election');
const { Member } = require('../src/models/Member');
const { User } = require('../src/models/User');

async function checkVoteRecordings() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all vote recordings
    const recordings = await VoteRecording.find()
      .populate({
        path: 'voterId',
        select: 'studentId userId',
        populate: { path: 'userId', select: 'firstName lastName' }
      })
      .populate('electionId', 'name')
      .lean();

    console.log(`📊 Total Vote Recordings: ${recordings.length}\n`);

    if (recordings.length === 0) {
      console.log('❌ No vote recordings found in database');
      console.log('\n💡 To see voting videos, you need to:');
      console.log('   1. Create an election');
      console.log('   2. Have voters cast votes with video recording enabled');
      console.log('   3. The frontend must upload video during voting\n');
    } else {
      console.log('📹 Vote Recordings:\n');
      
      // Group by election
      const byElection = {};
      recordings.forEach(rec => {
        const electionId = rec.electionId?._id?.toString() || 'Unknown';
        const electionName = rec.electionId?.name || 'Unknown Election';
        
        if (!byElection[electionId]) {
          byElection[electionId] = {
            name: electionName,
            id: electionId,
            recordings: []
          };
        }
        byElection[electionId].recordings.push(rec);
      });

      // Display grouped results
      Object.values(byElection).forEach(election => {
        console.log(`\n📋 Election: ${election.name} (ID: ${election.id})`);
        console.log(`   Videos: ${election.recordings.length}`);
        
        election.recordings.forEach((rec, idx) => {
          const voterName = rec.voterId?.userId 
            ? `${rec.voterId.userId.firstName} ${rec.voterId.userId.lastName}`
            : 'Unknown Voter';
          const studentId = rec.voterId?.studentId || 'N/A';
          const duration = rec.duration ? `${rec.duration}s` : 'N/A';
          const size = rec.fileSizeBytes ? `${(rec.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB` : 'N/A';
          
          console.log(`   ${idx + 1}. ${voterName} (${studentId})`);
          console.log(`      Duration: ${duration}, Size: ${size}`);
          console.log(`      URL: ${rec.secureUrl}`);
          console.log(`      Uploaded: ${new Date(rec.uploadedAt).toLocaleString()}`);
          console.log(`      Vote Linked: ${rec.voteId ? 'Yes' : 'No'}`);
        });
      });
    }

    // Check all elections
    console.log('\n\n📋 All Elections:');
    const elections = await Election.find().select('name status startDate endDate').lean();
    
    if (elections.length === 0) {
      console.log('   No elections found');
    } else {
      elections.forEach((election, idx) => {
        const count = recordings.filter(r => 
          r.electionId?._id?.toString() === election._id.toString()
        ).length;
        console.log(`   ${idx + 1}. ${election.name} (${election.status}) - ${count} videos`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

checkVoteRecordings();
