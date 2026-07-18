require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

// Import models
const ElectionCandidate = require('../src/models/ElectionCandidate').ElectionCandidate;
const EcPost = require('../src/models/EcPost').EcPost;
const Election = require('../src/models/Election').Election;
const Member = require('../src/models/Member').Member;

async function fixUnassignedCandidates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find Phase 2 candidates without post assignments
    const unassignedCandidates = await ElectionCandidate.find({
      phase: 2,
      postId: null
    })
    .populate({ 
      path: "memberId", 
      select: "studentId batch currentYear userId", 
      populate: { path: "userId", select: "firstName lastName email" } 
    })
    .populate("electionId", "name currentPhase");

    if (unassignedCandidates.length === 0) {
      console.log('✅ No unassigned Phase 2 candidates found!');
      process.exit(0);
    }

    console.log(`⚠️  Found ${unassignedCandidates.length} Phase 2 candidates without post assignments:\n`);

    for (const candidate of unassignedCandidates) {
      console.log('─'.repeat(80));
      console.log(`Candidate ID: ${candidate._id}`);
      console.log(`Student ID: ${candidate.memberId?.studentId}`);
      console.log(`Name: ${candidate.memberId?.userId?.firstName} ${candidate.memberId?.userId?.lastName}`);
      console.log(`Election: ${candidate.electionId?.name} (Phase ${candidate.electionId?.currentPhase})`);
      console.log(`Status: ${candidate.status}`);
      console.log();
    }

    console.log('\n📋 Options:\n');
    console.log('1. Delete these candidates (they should not be in Phase 2 without a post)');
    console.log('2. List available EC posts to manually assign them');
    console.log('3. Exit without changes');
    console.log('\nNote: These candidates likely need to be re-added with proper post assignments.\n');

    // List available posts for reference
    const posts = await EcPost.find().sort({ displayOrder: 1 });
    console.log('📋 Available EC Posts:\n');
    posts.forEach((post, idx) => {
      console.log(`${idx + 1}. ${post.title} (${post.code}) - Min Year: ${post.minYear || 'N/A'}, Min EC Years: ${post.minEcYears || 0}`);
    });

    console.log('\n⚠️  These Phase 2 candidates have NULL postId, which violates the schema validation.');
    console.log('⚠️  They should either:');
    console.log('   1. Be deleted and re-added with proper post assignments');
    console.log('   2. Have their phase changed to 1 (if they were meant to be Phase 1 candidates)');
    console.log('   3. Be assigned a valid post ID');
    console.log('\nTo fix this issue, you should either:');
    console.log('  - Delete these candidates from the database');
    console.log('  - Or manually update them with a postId');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixUnassignedCandidates();
