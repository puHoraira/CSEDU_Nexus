require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

// Import models
const ElectionCandidate = require('../src/models/ElectionCandidate').ElectionCandidate;
const EcPost = require('../src/models/EcPost').EcPost;
const Election = require('../src/models/Election').Election;
const Member = require('../src/models/Member').Member;
const User = require('../src/models/User').User;

async function investigate() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find candidates without posts
    const candidatesWithoutPosts = await ElectionCandidate.find({
      postId: null
    })
    .populate({ 
      path: "memberId", 
      select: "studentId batch currentYear userId", 
      populate: { path: "userId", select: "firstName lastName email" } 
    })
    .populate("electionId", "name currentPhase");

    console.log(`📋 Found ${candidatesWithoutPosts.length} candidates without post assignments:\n`);

    for (const candidate of candidatesWithoutPosts) {
      console.log('─'.repeat(80));
      console.log(`Candidate ID: ${candidate._id}`);
      console.log(`Student ID: ${candidate.memberId?.studentId}`);
      console.log(`Name: ${candidate.memberId?.userId?.firstName} ${candidate.memberId?.userId?.lastName}`);
      console.log(`Election: ${candidate.electionId?.name}`);
      console.log(`Election Phase (from election): ${candidate.electionId?.currentPhase}`);
      console.log(`Candidate Phase (from candidate): ${candidate.phase}`);
      console.log(`Status: ${candidate.status}`);
      console.log(`Post ID: ${candidate.postId}`);
      
      // Check if this is a mismatch
      if (candidate.electionId?.currentPhase === 2 && !candidate.postId) {
        console.log('⚠️  MISMATCH: Election is in Phase 2, but candidate has no post!');
        console.log(`   This candidate shows as "Unassigned Post" in the UI.`);
        console.log(`   Candidate's phase field: ${candidate.phase}`);
      }
      console.log();
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

investigate();
