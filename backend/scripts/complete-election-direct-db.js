/**
 * Direct Database Election Completion Script
 * Bypasses API authentication to complete the full election cycle
 * Uses existing election: 6a59d3a473c6d620655db9a5
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/csedu';
const ELECTION_ID = '6a59d3a473c6d620655db9a5';

function log(message, data = null) {
  console.log(`\n📋 ${message}`);
  if (data) console.log(JSON.stringify(data, null, 2));
}

function logSuccess(message) {
  console.log(`✅ ${message}`);
}

function logError(message, error) {
  console.error(`\n❌ ${message}`);
  console.error(error);
}

async function main() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🗳️  DIRECT DATABASE ELECTION COMPLETION');
    console.log('='.repeat(80));
    
    console.log('\n🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const Election = mongoose.connection.collection('elections');
    const Member = mongoose.connection.collection('members');
    const User = mongoose.connection.collection('users');
    const ElectionCandidate = mongoose.connection.collection('electioncandidates');
    const ElectionVote = mongoose.connection.collection('electionvotes');
    const EcPost = mongoose.connection.collection('ecposts');
    const ElectionCommission = mongoose.connection.collection('electioncommissions');
    
    const electionObjId = new mongoose.Types.ObjectId(ELECTION_ID);
    
    // Step 1: Get election details
    log('Step 1: Getting election details...');
    const election = await Election.findOne({ _id: electionObjId });
    if (!election) {
      throw new Error('Election not found');
    }
    log('Election status', { 
      name: election.name, 
      status: election.status, 
      currentPhase: election.currentPhase 
    });
    
    // Step 2: Get all active members
    log('Step 2: Loading active members...');
    const members = await Member.find({ status: 'Active' }).toArray();
    const users = await User.find({ 
      _id: { $in: members.map(m => m.userId) } 
    }).toArray();
    
    const userMap = {};
    users.forEach(u => userMap[u._id.toString()] = u);
    
    const students = members.map(m => ({
      member: m,
      user: userMap[m.userId.toString()]
    })).filter(s => s.user);
    
    logSuccess(`Loaded ${students.length} students`);
    
    // Step 3: Get EC Posts
    log('Step 3: Loading EC Posts...');
    const ecPosts = await EcPost.find({ isActive: true }).sort({ order: 1 }).toArray();
    logSuccess(`Loaded ${ecPosts.length} EC Posts`);
    
    // Step 4: Check current candidates
    log('Step 4: Checking existing candidates...');
    const existingCandidates = await ElectionCandidate.find({ 
      electionId: electionObjId 
    }).toArray();
    
    const phase1Candidates = existingCandidates.filter(c => !c.postId);
    const phase2Candidates = existingCandidates.filter(c => c.postId);
    
    log(`Phase 1 candidates: ${phase1Candidates.length}`);
    log(`Phase 2 candidates: ${phase2Candidates.length}`);
    
    // Step 5: Add Phase 2 candidates if needed
    if (phase2Candidates.length === 0) {
      log('Step 5: Adding Phase 2 candidates...');
      
      // Select eligible students (Year 2+ with good attendance)
      const eligibleStudents = students.filter(s => 
        s.member.currentYear >= 2 && 
        s.member.ecEligibility?.isEligible !== false
      );
      
      log(`Found ${eligibleStudents.length} eligible students for Phase 2`);
      
      // Add candidates for each post
      const candidatesToAdd = [];
      const postsToUse = ecPosts.slice(0, Math.min(ecPosts.length, eligibleStudents.length));
      
      for (let i = 0; i < postsToUse.length; i++) {
        const post = postsToUse[i];
        const student = eligibleStudents[i % eligibleStudents.length];
        
        candidatesToAdd.push({
          electionId: electionObjId,
          memberId: student.member._id,
          postId: post._id,
          phase: 2,
          status: 'Approved', // Auto-approve for testing
          applicationDate: new Date(),
          memberEcYears: student.member.ecEligibility?.yearsInEc || 0,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      
      if (candidatesToAdd.length > 0) {
        await ElectionCandidate.insertMany(candidatesToAdd);
        logSuccess(`Added ${candidatesToAdd.length} Phase 2 candidates`);
      }
      
      // Reload candidates
      phase2Candidates.length = 0;
      phase2Candidates.push(...await ElectionCandidate.find({ 
        electionId: electionObjId,
        postId: { $exists: true, $ne: null }
      }).toArray());
    } else {
      log('Step 5: Phase 2 candidates already exist, skipping...');
    }
    
    // Step 6: Ensure election is in Phase2_Active
    if (election.status !== 'Phase2_Active') {
      log('Step 6: Activating Phase 2...');
      await Election.updateOne(
        { _id: electionObjId },
        { 
          $set: { 
            status: 'Phase2_Active',
            currentPhase: 2,
            updatedAt: new Date()
          } 
        }
      );
      logSuccess('Phase 2 activated');
    } else {
      log('Step 6: Phase 2 already active');
    }
    
    // Step 7: Conduct Phase 2 voting
    log('Step 7: Conducting Phase 2 voting...');
    
    // Check existing Phase 2 votes
    const existingPhase2Votes = await ElectionVote.find({
      electionId: electionObjId,
      phase: 2
    }).toArray();
    
    log(`Existing Phase 2 votes: ${existingPhase2Votes.length}`);
    
    if (existingPhase2Votes.length === 0) {
      // Group candidates by post
      const candidatesByPost = {};
      phase2Candidates.forEach(c => {
        const postId = c.postId.toString();
        if (!candidatesByPost[postId]) candidatesByPost[postId] = [];
        candidatesByPost[postId].push(c);
      });
      
      const votesToAdd = [];
      let voteCount = 0;
      
      // Each student votes for one candidate per post
      for (const student of students) {
        for (const [postId, candidates] of Object.entries(candidatesByPost)) {
          // Random candidate for this post
          const randomCandidate = candidates[Math.floor(Math.random() * candidates.length)];
          
          votesToAdd.push({
            electionId: electionObjId,
            voterId: student.member._id,
            candidateId: randomCandidate._id,
            postId: new mongoose.Types.ObjectId(postId),
            phase: 2,
            timestamp: new Date(),
            createdAt: new Date()
          });
          
          voteCount++;
          
          // Insert in batches of 50
          if (votesToAdd.length >= 50) {
            await ElectionVote.insertMany(votesToAdd);
            console.log(`  ${voteCount} votes cast...`);
            votesToAdd.length = 0;
          }
        }
      }
      
      // Insert remaining votes
      if (votesToAdd.length > 0) {
        await ElectionVote.insertMany(votesToAdd);
      }
      
      logSuccess(`Phase 2 voting complete: ${voteCount} votes cast`);
    } else {
      log('Phase 2 voting already completed');
    }
    
    // Step 8: Complete Phase 2
    log('Step 8: Completing Phase 2...');
    await Election.updateOne(
      { _id: electionObjId },
      { 
        $set: { 
          status: 'Phase2_Completed',
          currentPhase: 2,
          updatedAt: new Date()
        } 
      }
    );
    logSuccess('Phase 2 completed');
    
    // Step 9: Calculate and store results
    log('Step 9: Calculating results...');
    
    // Phase 2 results
    const phase2Results = [];
    const candidatesByPost = {};
    phase2Candidates.forEach(c => {
      const postId = c.postId.toString();
      if (!candidatesByPost[postId]) candidatesByPost[postId] = [];
      candidatesByPost[postId].push(c);
    });
    
    for (const [postId, candidates] of Object.entries(candidatesByPost)) {
      const postVotes = await ElectionVote.find({
        electionId: electionObjId,
        postId: new mongoose.Types.ObjectId(postId),
        phase: 2
      }).toArray();
      
      const voteCounts = {};
      postVotes.forEach(v => {
        const cId = v.candidateId.toString();
        voteCounts[cId] = (voteCounts[cId] || 0) + 1;
      });
      
      const post = ecPosts.find(p => p._id.toString() === postId);
      
      candidates.forEach(c => {
        const votes = voteCounts[c._id.toString()] || 0;
        const member = students.find(s => s.member._id.toString() === c.memberId.toString())?.member;
        
        phase2Results.push({
          postId: new mongoose.Types.ObjectId(postId),
          postTitle: post?.title || 'Unknown Post',
          candidateId: c._id,
          memberId: c.memberId,
          studentId: member?.studentId,
          votes,
          percentage: postVotes.length > 0 ? (votes / postVotes.length * 100).toFixed(2) : 0
        });
      });
    }
    
    // Sort by post and votes
    phase2Results.sort((a, b) => {
      if (a.postTitle !== b.postTitle) return a.postTitle.localeCompare(b.postTitle);
      return b.votes - a.votes;
    });
    
    // Update election with results
    await Election.updateOne(
      { _id: electionObjId },
      { 
        $set: { 
          'results.phase2': phase2Results,
          'results.phase2PublishedAt': new Date(),
          updatedAt: new Date()
        } 
      }
    );
    
    logSuccess('Results calculated and stored');
    log('Phase 2 Results Summary:');
    
    // Group results by post for display
    const resultsByPost = {};
    phase2Results.forEach(r => {
      if (!resultsByPost[r.postTitle]) resultsByPost[r.postTitle] = [];
      resultsByPost[r.postTitle].push(r);
    });
    
    for (const [postTitle, results] of Object.entries(resultsByPost)) {
      console.log(`\n  ${postTitle}:`);
      results.forEach((r, i) => {
        console.log(`    ${i + 1}. ${r.studentId || 'Unknown'}: ${r.votes} votes (${r.percentage}%)`);
      });
    }
    
    // Step 10: Mark election as completed
    log('\nStep 10: Marking election as completed...');
    await Election.updateOne(
      { _id: electionObjId },
      { 
        $set: { 
          status: 'Completed',
          updatedAt: new Date()
        } 
      }
    );
    logSuccess('Election marked as completed');
    
    // Step 11: Get commission and check if we need to create appointments
    log('Step 11: Creating EC appointments for winners...');
    
    const EcAppointment = mongoose.connection.collection('ecappointments');
    
    // Get winners (top candidate per post)
    const winners = [];
    for (const [postTitle, results] of Object.entries(resultsByPost)) {
      if (results.length > 0) {
        const winner = results[0]; // Highest votes
        const post = ecPosts.find(p => p.title === postTitle);
        const member = students.find(s => s.member._id.toString() === winner.memberId.toString());
        
        if (post && member) {
          winners.push({
            postId: post._id,
            memberId: member.member._id,
            userId: member.user._id,
            termId: election.termId,
            appointmentDate: new Date(),
            status: 'Active',
            electionId: electionObjId,
            votes: winner.votes,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
      }
    }
    
    // Check for existing appointments
    const existingAppointments = await EcAppointment.find({
      electionId: electionObjId
    }).toArray();
    
    if (existingAppointments.length === 0 && winners.length > 0) {
      await EcAppointment.insertMany(winners);
      logSuccess(`Created ${winners.length} EC appointments`);
      
      winners.forEach((w, i) => {
        const post = ecPosts.find(p => p._id.toString() === w.postId.toString());
        const member = students.find(s => s.member._id.toString() === w.memberId.toString());
        console.log(`  ${i + 1}. ${post?.title}: ${member?.member.studentId} (${w.votes} votes)`);
      });
    } else if (existingAppointments.length > 0) {
      log(`EC appointments already exist (${existingAppointments.length})`);
    } else {
      log('No winners to appoint');
    }
    
    // Final summary
    console.log('\n' + '='.repeat(80));
    console.log('🎉 ELECTION COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(80));
    
    const finalElection = await Election.findOne({ _id: electionObjId });
    const totalPhase2Votes = await ElectionVote.countDocuments({
      electionId: electionObjId,
      phase: 2
    });
    
    console.log(`\n📊 Final Summary:`);
    console.log(`   Election: ${finalElection.name}`);
    console.log(`   Status: ${finalElection.status}`);
    console.log(`   Phase 1 Candidates: ${phase1Candidates.length}`);
    console.log(`   Phase 2 Candidates: ${phase2Candidates.length}`);
    console.log(`   Phase 2 Votes Cast: ${totalPhase2Votes}`);
    console.log(`   Winners Appointed: ${winners.length}`);
    console.log(`\n🌐 View results at: http://localhost:3000/dashboard/elections/${ELECTION_ID}`);
    console.log('\n');
    
  } catch (error) {
    logError('Script failed', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB\n');
  }
}

main()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
