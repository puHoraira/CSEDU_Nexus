require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

// Import models properly
const ElectionCandidate = require('../src/models/ElectionCandidate').ElectionCandidate;
const EcPost = require('../src/models/EcPost').EcPost;
const Election = require('../src/models/Election').Election;
const Member = require('../src/models/Member').Member;
const User = require('../src/models/User').User;

async function debugCandidatePosts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get all candidates from recent elections
    const candidates = await ElectionCandidate.find({})
      .populate({ 
        path: "memberId", 
        select: "studentId batch currentYear status userId", 
        populate: { path: "userId", select: "firstName lastName email" } 
      })
      .populate("postId", "title code displayOrder")
      .populate("electionId", "name currentPhase")
      .sort({ createdAt: -1 })
      .limit(20);

    console.log(`\n📋 Found ${candidates.length} recent candidates:\n`);

    for (const candidate of candidates) {
      console.log('─'.repeat(80));
      console.log(`Candidate ID: ${candidate._id}`);
      console.log(`Election: ${candidate.electionId?.name || 'Unknown'} (Phase ${candidate.electionId?.currentPhase || 'N/A'})`);
      console.log(`Member: ${candidate.memberId?.userId?.firstName} ${candidate.memberId?.userId?.lastName} (${candidate.memberId?.studentId})`);
      console.log(`Batch: ${candidate.memberId?.batch || 'N/A'}`);
      console.log(`Status: ${candidate.status}`);
      console.log(`Post ID (raw): ${candidate.postId}`);
      
      if (candidate.postId && typeof candidate.postId === 'object') {
        console.log(`Post Title: ${candidate.postId.title || 'N/A'}`);
        console.log(`Post Code: ${candidate.postId.code || 'N/A'}`);
      } else if (candidate.postId) {
        console.log(`⚠️  Post ID exists but not populated: ${candidate.postId}`);
        // Try to manually fetch the post
        const post = await EcPost.findById(candidate.postId);
        if (post) {
          console.log(`   Manually fetched: ${post.title} (${post.code})`);
        } else {
          console.log(`   ❌ Post not found in database!`);
        }
      } else {
        console.log(`❌ No Post ID assigned (expected for Phase 1)`);
      }
      console.log();
    }

    // Check if there are any Phase 2 candidates without posts
    const phase2CandidatesWithoutPosts = candidates.filter(c => 
      c.electionId?.currentPhase === 2 && !c.postId
    );

    if (phase2CandidatesWithoutPosts.length > 0) {
      console.log('\n⚠️  WARNING: Found Phase 2 candidates without post assignments:');
      phase2CandidatesWithoutPosts.forEach(c => {
        console.log(`  - ${c.memberId?.studentId} in election "${c.electionId?.name}"`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

debugCandidatePosts();
