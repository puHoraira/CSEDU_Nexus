require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

async function addPhase2Candidates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const { Election } = require('../src/models/Election');
    const { ElectionCandidate } = require('../src/models/ElectionCandidate');
    const { Member } = require('../src/models/Member');
    const { EcPost } = require('../src/models/EcPost');

    // Find the "hudai" election
    const election = await Election.findOne({ name: 'hudai' });
    if (!election) {
      console.log('❌ "hudai" election not found');
      return;
    }

    console.log(`\n📊 Found election: ${election.name} (${election._id})`);
    console.log(`Current Phase: ${election.currentPhase}`);

    // Get active members (potential candidates)
    const members = await Member.find({ status: 'Active' }).limit(5);
    console.log(`\n👥 Found ${members.length} active members`);

    // Get available posts (any posts, Phase 2 uses posts 1-11)
    const posts = await EcPost.find({ isActive: true }).sort({ displayOrder: 1 }).limit(5);
    console.log(`📋 Found ${posts.length} posts`);
    
    // If no posts, log all posts
    if (posts.length === 0) {
      const allPosts = await EcPost.find();
      console.log(`⚠️  Total posts in database: ${allPosts.length}`);
      if (allPosts.length > 0) {
        console.log('All posts:', allPosts.map(p => `${p.code}. ${p.title} (active: ${p.isActive})`).join(', '));
      }
    }

    if (members.length === 0 || posts.length === 0) {
      console.log('❌ Need at least 1 member and 1 post to add candidates');
      return;
    }

    // Add Phase 2 candidates
    console.log('\n➕ Adding Phase 2 candidates...\n');
    
    const candidatesToAdd = Math.min(members.length, posts.length, 3);
    
    for (let i = 0; i < candidatesToAdd; i++) {
      const member = members[i];
      const post = posts[i % posts.length];

      const candidate = new ElectionCandidate({
        electionId: election._id,
        memberId: member._id,
        postId: post._id,
        phase: 2,
        status: 'Approved', // Auto-approve for testing
        batch: member.batch,
        ecYears: 0, // Will be calculated by service
        submittedAt: new Date(),
      });

      await candidate.save();
      
      console.log(`✅ Added candidate:`);
      console.log(`   Member: ${member.studentId}`);
      console.log(`   Post: ${post.title} (${post.code})`);
      console.log(`   Phase: 2`);
      console.log(`   Status: Approved\n`);
    }

    // Verify
    const phase2Count = await ElectionCandidate.countDocuments({ 
      electionId: election._id, 
      phase: 2 
    });

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`✅ Successfully added ${candidatesToAdd} Phase 2 candidates`);
    console.log(`📊 Total Phase 2 candidates in "${election.name}": ${phase2Count}`);
    console.log(`\n💡 Now refresh the candidates page in your browser to see them!`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

addPhase2Candidates();
