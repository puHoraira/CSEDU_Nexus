/**
 * Complete Election Cycle Test Script
 * ====================================
 * This script simulates a full election from start to finish:
 * 1. Creates test users and members from different batches
 * 2. Creates an EC term and election
 * 3. Forms an election commission
 * 4. Submits candidate applications
 * 5. Reviews and approves candidates
 * 6. Opens Phase 1 voting (batch representatives)
 * 7. Simulates voting by multiple users
 * 8. Closes Phase 1 and publishes results
 * 9. Opens Phase 2 voting (office bearers)
 * 10. Simulates Phase 2 voting
 * 11. Closes Phase 2 and publishes final results
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const { User } = require('../src/models/User');
const { Member } = require('../src/models/Member');
const { EcTerm } = require('../src/models/EcTerm');
const { EcPost } = require('../src/models/EcPost');
const { Election } = require('../src/models/Election');
const { ElectionCommission } = require('../src/models/ElectionCommission');
const { ElectionCandidate } = require('../src/models/ElectionCandidate');
const { Vote } = require('../src/models/Vote');

// Configuration
const MODERATOR_EMAIL = 'abuhoraira10152@gmail.com';
const ADMIN_EMAIL = 'abuhoraira10153@gmail.com';
const TEST_PASSWORD = 'Test@123';

// Test data
const BATCHES = ['2020', '2021', '2022', '2023'];
const USERS_PER_BATCH = 15; // Total will be 60 users

let createdData = {
  users: [],
  members: [],
  moderator: null,
  admin: null,
  term: null,
  election: null,
  commission: null,
  posts: [],
  candidates: {
    phase1: [],
    phase2: []
  },
  votes: {
    phase1: [],
    phase2: []
  }
};

// Utility functions
function log(message, data = null) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`✓ ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
  console.log('='.repeat(60));
}

function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Database connection
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/iplab');
    log('Connected to database successfully');
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
}

// Step 1: Get existing moderator and admin
async function getExistingUsers() {
  log('Step 1: Fetching existing moderator and admin users');
  
  createdData.moderator = await User.findOne({ email: MODERATOR_EMAIL });
  if (!createdData.moderator) {
    throw new Error(`Moderator ${MODERATOR_EMAIL} not found`);
  }
  
  createdData.admin = await User.findOne({ email: ADMIN_EMAIL });
  if (!createdData.admin) {
    throw new Error(`Admin ${ADMIN_EMAIL} not found`);
  }
  
  log('Found existing users', {
    moderator: createdData.moderator.email,
    admin: createdData.admin.email
  });
}

// Step 2: Create test users and members for different batches
async function createTestUsersAndMembers() {
  log('Step 2: Creating test users and members');
  
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
  
  for (const batch of BATCHES) {
    for (let i = 1; i <= USERS_PER_BATCH; i++) {
      const studentId = `${batch}01${String(i).padStart(3, '0')}`;
      const email = `test${batch}.${i}@student.ac.bd`;
      
      // Check if user already exists
      let user = await User.findOne({ email });
      
      if (!user) {
        user = await User.create({
          email,
          passwordHash,
          firstName: `Student${i}`,
          lastName: `Batch${batch}`,
          phone: `01700${batch}${String(i).padStart(3, '0')}`,
          roles: ['General Member'],
          emailVerified: true,
          isActive: true
        });
      }
      
      createdData.users.push(user);
      
      // Check if member already exists
      let member = await Member.findOne({ userId: user._id });
      
      if (!member) {
        member = await Member.create({
          userId: user._id,
          studentId,
          batch: parseInt(batch),
          currentYear: 2024 - parseInt(batch) + 1, // Calculate year based on batch
          department: 'Computer Science',
          cgpa: 3.0 + Math.random() * 0.9, // 3.0 to 3.9
          attendancePercentage: 75 + Math.random() * 20, // 75% to 95%
          status: 'Active',
          membershipStatus: {
            status: 'Active',
            statusUpdatedAt: new Date()
          },
          disciplinaryActions: 0,
          isGraduating: parseInt(batch) === 2020 // Only 2020 batch is graduating
        });
      }
      
      createdData.members.push(member);
    }
  }
  
  log(`Created ${createdData.users.length} test users and members`, {
    batches: BATCHES,
    usersPerBatch: USERS_PER_BATCH,
    totalUsers: createdData.users.length
  });
}

// Step 3: Create or get EC Term
async function createECTerm() {
  log('Step 3: Creating EC Term');
  
  // Check if there's an active term
  let term = await EcTerm.findOne({ status: 'Active' });
  
  if (!term) {
    term = await EcTerm.create({
      name: 'Test EC Term 2024-2025',
      startsOn: new Date(),
      endsOn: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      status: 'Active',
      createdBy: createdData.admin._id
    });
  }
  
  createdData.term = term;
  
  log('EC Term ready', {
    id: term._id,
    name: term.name,
    status: term.status
  });
}

// Step 4: Get EC Posts
async function getECPosts() {
  log('Step 4: Fetching EC Posts');
  
  createdData.posts = await EcPost.find({ isActive: true }).sort({ displayOrder: 1 });
  
  if (createdData.posts.length === 0) {
    throw new Error('No active EC posts found. Please seed posts first.');
  }
  
  log(`Found ${createdData.posts.length} active EC posts`, {
    posts: createdData.posts.map(p => ({ title: p.title, code: p.code }))
  });
}

// Step 5: Create Election
async function createElection() {
  log('Step 5: Creating Election');
  
  // Clean up any draft elections
  await Election.deleteMany({ status: 'Draft', termId: createdData.term._id });
  
  const election = await Election.create({
    name: 'Test General Election 2024',
    description: 'Full cycle test election',
    termId: createdData.term._id,
    status: 'Draft',
    currentPhase: 0,
    config: {
      allowSelfNomination: true,
      eligibility: {
        minCgpa: 2.5,
        minAttendance: 75,
        maxDisciplinaryActions: 0,
        excludeGraduating: false
      }
    },
    phase1: {
      name: 'Batch Representative Election',
      description: 'Election for Executive Members',
      status: 'Not_Started',
      maxVotesPerVoter: 5,
      eligibleBatches: BATCHES
    },
    phase2: {
      name: 'Office Bearer Election',
      description: 'Election for Executive Committee Posts 1-11',
      status: 'Not_Started',
      eligibleVoters: 'All_Members'
    }
  });
  
  createdData.election = election;
  
  log('Election created', {
    id: election._id,
    name: election.name,
    status: election.status
  });
}

// Step 6: Create Election Commission
async function createElectionCommission() {
  log('Step 6: Creating Election Commission');
  
  // Find two additional commissioners from test users
  const testUsers = createdData.users.slice(0, 2); // Use first 2 test users as commissioners
  
  if (testUsers.length < 2) {
    throw new Error('Not enough users to form election commission');
  }
  
  const commission = await ElectionCommission.create({
    electionId: createdData.election._id,
    termId: createdData.term._id,
    chiefCommissioner: createdData.moderator._id,
    commissioners: testUsers.map(u => ({
      userId: u._id,
      role: 'Commissioner',
      appointedBy: createdData.admin._id
    })),
    electionConfig: {
      candidateRegistrationDeadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      campaignStartDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // 4 days
      campaignEndDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days
      minCgpaForCandidacy: 2.5,
      minAttendanceForVoting: 75,
      maxDisciplinaryActions: 0
    },
    status: 'Active',
    formedAt: new Date()
  });
  
  // Update election with commission reference
  createdData.election.commissionId = commission._id;
  createdData.election.supervisedBy = createdData.moderator._id;
  await createdData.election.save();
  
  createdData.commission = commission;
  
  log('Election Commission formed', {
    id: commission._id,
    chiefCommissioner: createdData.moderator.email,
    commissioners: testUsers.map(u => u.email)
  });
}

// Step 7: Submit Phase 1 Candidate Applications (Batch Representatives)
async function submitPhase1Candidates() {
  log('Step 7: Submitting Phase 1 Candidate Applications');
  
  // For each batch, select 8-10 random members as candidates
  for (const batch of BATCHES) {
    const batchMembers = createdData.members.filter(m => m.batch === parseInt(batch));
    const candidateCount = randomInt(8, 10);
    const selectedMembers = [];
    
    // Randomly select members
    while (selectedMembers.length < candidateCount && selectedMembers.length < batchMembers.length) {
      const member = randomChoice(batchMembers);
      if (!selectedMembers.includes(member)) {
        selectedMembers.push(member);
      }
    }
    
    for (const member of selectedMembers) {
      const candidate = await ElectionCandidate.create({
        electionId: createdData.election._id,
        memberId: member._id,
        phase: 1,
        batch: parseInt(batch),
        candidateStatement: `I want to serve Batch ${batch} as a representative`,
        campaignSlogan: `Vote for ${member.studentId}!`,
        nominationType: 'Self_Nomination',
        status: 'Submitted',
        submittedAt: new Date()
      });
      
      createdData.candidates.phase1.push(candidate);
    }
  }
  
  log(`Submitted ${createdData.candidates.phase1.length} Phase 1 candidates`, {
    byBatch: BATCHES.map(b => ({
      batch: b,
      count: createdData.candidates.phase1.filter(c => c.batch === parseInt(b)).length
    }))
  });
}

// Step 8: Review and Approve Phase 1 Candidates
async function reviewPhase1Candidates() {
  log('Step 8: Reviewing and approving Phase 1 candidates');
  
  let approvedCount = 0;
  let rejectedCount = 0;
  
  for (const candidate of createdData.candidates.phase1) {
    // Approve 90% of candidates, reject 10%
    const shouldApprove = Math.random() > 0.1;
    
    candidate.status = shouldApprove ? 'Approved' : 'Rejected';
    candidate.rejectionReason = shouldApprove ? '' : 'Did not meet eligibility criteria';
    candidate.reviewedBy = createdData.moderator._id;
    candidate.reviewedAt = new Date();
    candidate.eligibilityChecked = true;
    
    await candidate.save();
    
    if (shouldApprove) {
      approvedCount++;
    } else {
      rejectedCount++;
    }
  }
  
  log('Phase 1 candidates reviewed', {
    total: createdData.candidates.phase1.length,
    approved: approvedCount,
    rejected: rejectedCount
  });
}

// Step 9: Open Phase 1 Voting
async function openPhase1Voting() {
  log('Step 9: Opening Phase 1 voting');
  
  createdData.election.status = 'Phase1_Active';
  createdData.election.currentPhase = 1;
  createdData.election.phase1.status = 'Voting_Active';
  createdData.election.phase1.votingStart = new Date();
  createdData.election.phase1.votingEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  
  await createdData.election.save();
  
  log('Phase 1 voting opened', {
    status: createdData.election.status,
    votingEnd: createdData.election.phase1.votingEnd
  });
}

// Step 10: Simulate Phase 1 Voting
async function simulatePhase1Voting() {
  log('Step 10: Simulating Phase 1 voting');
  
  let totalVotes = 0;
  
  // Each member votes for up to 5 candidates from their batch
  for (const member of createdData.members) {
    const batchCandidates = createdData.candidates.phase1.filter(
      c => c.batch === member.batch && c.status === 'Approved'
    );
    
    if (batchCandidates.length === 0) continue;
    
    // Vote for 3-5 random candidates
    const voteCount = Math.min(randomInt(3, 5), batchCandidates.length);
    const votedCandidates = [];
    
    while (votedCandidates.length < voteCount) {
      const candidate = randomChoice(batchCandidates);
      if (!votedCandidates.find(c => c._id.equals(candidate._id))) {
        votedCandidates.push(candidate);
      }
    }
    
    for (const candidate of votedCandidates) {
      const vote = await Vote.create({
        electionId: createdData.election._id,
        voterMemberId: member._id,
        candidateId: candidate._id,
        phase: 1,
        batch: member.batch,
        voteType: 'Regular',
        voterVerified: true,
        verificationMethod: 'Student_ID',
        isValid: true,
        castAt: new Date()
      });
      
      createdData.votes.phase1.push(vote);
      totalVotes++;
    }
  }
  
  log(`Phase 1 voting completed`, {
    totalVotes,
    uniqueVoters: createdData.members.length,
    averageVotesPerVoter: (totalVotes / createdData.members.length).toFixed(2)
  });
}

// Step 11: Close Phase 1 and Tally Results
async function closePhase1AndTally() {
  log('Step 11: Closing Phase 1 and tallying results');
  
  createdData.election.status = 'Phase1_Completed';
  createdData.election.phase1.status = 'Completed';
  createdData.election.phase1.resultsPublishedAt = new Date();
  
  // Calculate results per batch
  const results = [];
  
  for (const batch of BATCHES) {
    const batchVotes = createdData.votes.phase1.filter(v => v.batch === parseInt(batch));
    const voteCounts = {};
    
    batchVotes.forEach(vote => {
      const candidateId = vote.candidateId.toString();
      voteCounts[candidateId] = (voteCounts[candidateId] || 0) + 1;
    });
    
    const sortedCandidates = Object.entries(voteCounts)
      .map(([candidateId, votes]) => ({ candidateId, votes }))
      .sort((a, b) => b.votes - a.votes)
      .slice(0, 5); // Top 5 winners per batch
    
    const batchResult = {
      batch: parseInt(batch),
      totalVotes: batchVotes.length,
      totalVoters: new Set(batchVotes.map(v => v.voterMemberId.toString())).size,
      winners: sortedCandidates.map((item, index) => ({
        candidateId: mongoose.Types.ObjectId(item.candidateId),
        votes: item.votes,
        percentage: (item.votes / batchVotes.length * 100).toFixed(2),
        rank: index + 1
      }))
    };
    
    results.push(batchResult);
  }
  
  createdData.election.results.phase1Results = results;
  await createdData.election.save();
  
  log('Phase 1 results tallied', {
    batches: results.map(r => ({
      batch: r.batch,
      totalVotes: r.totalVotes,
      winners: r.winners.length
    }))
  });
}

// Step 12: Submit Phase 2 Candidate Applications (Office Bearers)
async function submitPhase2Candidates() {
  log('Step 12: Submitting Phase 2 Candidate Applications');
  
  // Get office bearer posts (posts 1-11)
  const officeBearerPosts = createdData.posts.filter(p => p.displayOrder <= 11);
  
  for (const post of officeBearerPosts) {
    // Select 2-4 eligible candidates per post
    const eligibleMembers = createdData.members.filter(m => 
      m.currentYear >= (post.minYear || 1) && 
      !m.isGraduating &&
      m.cgpa >= 3.0
    );
    
    const candidateCount = Math.min(randomInt(2, 4), eligibleMembers.length);
    const selectedMembers = [];
    
    while (selectedMembers.length < candidateCount) {
      const member = randomChoice(eligibleMembers);
      if (!selectedMembers.includes(member)) {
        selectedMembers.push(member);
      }
    }
    
    for (const member of selectedMembers) {
      const candidate = await ElectionCandidate.create({
        electionId: createdData.election._id,
        memberId: member._id,
        phase: 2,
        postId: post._id,
        candidateStatement: `I am committed to serving as ${post.title}`,
        campaignSlogan: `Leadership for ${post.title}`,
        nominationType: 'Self_Nomination',
        status: 'Submitted',
        submittedAt: new Date()
      });
      
      createdData.candidates.phase2.push(candidate);
    }
  }
  
  log(`Submitted ${createdData.candidates.phase2.length} Phase 2 candidates`, {
    posts: officeBearerPosts.length,
    averageCandidatesPerPost: (createdData.candidates.phase2.length / officeBearerPosts.length).toFixed(1)
  });
}

// Step 13: Review and Approve Phase 2 Candidates
async function reviewPhase2Candidates() {
  log('Step 13: Reviewing and approving Phase 2 candidates');
  
  let approvedCount = 0;
  
  for (const candidate of createdData.candidates.phase2) {
    candidate.status = 'Approved';
    candidate.reviewedBy = createdData.moderator._id;
    candidate.reviewedAt = new Date();
    candidate.eligibilityChecked = true;
    
    await candidate.save();
    approvedCount++;
  }
  
  log('Phase 2 candidates reviewed', {
    total: createdData.candidates.phase2.length,
    approved: approvedCount
  });
}

// Step 14: Open Phase 2 Voting
async function openPhase2Voting() {
  log('Step 14: Opening Phase 2 voting');
  
  createdData.election.status = 'Phase2_Active';
  createdData.election.currentPhase = 2;
  createdData.election.phase2.status = 'Voting_Active';
  createdData.election.phase2.votingStart = new Date();
  createdData.election.phase2.votingEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  
  await createdData.election.save();
  
  log('Phase 2 voting opened', {
    status: createdData.election.status,
    votingEnd: createdData.election.phase2.votingEnd
  });
}

// Step 15: Simulate Phase 2 Voting
async function simulatePhase2Voting() {
  log('Step 15: Simulating Phase 2 voting');
  
  let totalVotes = 0;
  const officeBearerPosts = createdData.posts.filter(p => p.displayOrder <= 11);
  
  // Each member votes for one candidate per post
  for (const member of createdData.members) {
    for (const post of officeBearerPosts) {
      const postCandidates = createdData.candidates.phase2.filter(
        c => c.postId && c.postId.equals(post._id) && c.status === 'Approved'
      );
      
      if (postCandidates.length === 0) continue;
      
      // Vote for one random candidate for this post
      const candidate = randomChoice(postCandidates);
      
      const vote = await Vote.create({
        electionId: createdData.election._id,
        voterMemberId: member._id,
        candidateId: candidate._id,
        phase: 2,
        postId: post._id,
        voteType: 'Regular',
        voterVerified: true,
        verificationMethod: 'Student_ID',
        isValid: true,
        castAt: new Date()
      });
      
      createdData.votes.phase2.push(vote);
      totalVotes++;
    }
  }
  
  log(`Phase 2 voting completed`, {
    totalVotes,
    uniqueVoters: createdData.members.length,
    posts: officeBearerPosts.length
  });
}

// Step 16: Close Phase 2 and Tally Final Results
async function closePhase2AndTallyFinal() {
  log('Step 16: Closing Phase 2 and tallying final results');
  
  createdData.election.status = 'Completed';
  createdData.election.phase2.status = 'Completed';
  createdData.election.phase2.resultsPublishedAt = new Date();
  createdData.election.finalResultsPublishedAt = new Date();
  createdData.election.finalResultsPublishedBy = createdData.moderator._id;
  
  const results = [];
  const officeBearerPosts = createdData.posts.filter(p => p.displayOrder <= 11);
  
  for (const post of officeBearerPosts) {
    const postVotes = createdData.votes.phase2.filter(v => v.postId && v.postId.equals(post._id));
    const voteCounts = {};
    
    postVotes.forEach(vote => {
      const candidateId = vote.candidateId.toString();
      voteCounts[candidateId] = (voteCounts[candidateId] || 0) + 1;
    });
    
    const sortedCandidates = Object.entries(voteCounts)
      .map(([candidateId, votes]) => ({ candidateId, votes }))
      .sort((a, b) => b.votes - a.votes);
    
    const winner = sortedCandidates[0] ? {
      candidateId: mongoose.Types.ObjectId(sortedCandidates[0].candidateId),
      votes: sortedCandidates[0].votes,
      percentage: (sortedCandidates[0].votes / postVotes.length * 100).toFixed(2)
    } : null;
    
    const runnerUp = sortedCandidates[1] ? {
      candidateId: mongoose.Types.ObjectId(sortedCandidates[1].candidateId),
      votes: sortedCandidates[1].votes,
      percentage: (sortedCandidates[1].votes / postVotes.length * 100).toFixed(2)
    } : null;
    
    results.push({
      postId: post._id,
      totalVotes: postVotes.length,
      totalVoters: new Set(postVotes.map(v => v.voterMemberId.toString())).size,
      winner,
      runnerUp
    });
  }
  
  createdData.election.results.phase2Results = results;
  await createdData.election.save();
  
  log('Phase 2 results tallied and election completed!', {
    posts: results.length,
    totalPhase2Votes: createdData.votes.phase2.length
  });
}

// Main execution
async function runFullElectionCycle() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🗳️  COMPLETE ELECTION CYCLE TEST');
    console.log('='.repeat(80));
    
    await connectDB();
    
    await getExistingUsers();
    await createTestUsersAndMembers();
    await createECTerm();
    await getECPosts();
    await createElection();
    await createElectionCommission();
    
    // Phase 1: Batch Representatives
    console.log('\n' + '🎯 PHASE 1: BATCH REPRESENTATIVES'.padEnd(80, '='));
    await submitPhase1Candidates();
    await reviewPhase1Candidates();
    await openPhase1Voting();
    await simulatePhase1Voting();
    await closePhase1AndTally();
    
    // Phase 2: Office Bearers
    console.log('\n' + '🎯 PHASE 2: OFFICE BEARERS'.padEnd(80, '='));
    await submitPhase2Candidates();
    await reviewPhase2Candidates();
    await openPhase2Voting();
    await simulatePhase2Voting();
    await closePhase2AndTallyFinal();
    
    // Final Summary
    console.log('\n' + '='.repeat(80));
    console.log('✅ ELECTION CYCLE COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(80));
    console.log('\n📊 FINAL STATISTICS:');
    console.log(`   • Total Users Created: ${createdData.users.length}`);
    console.log(`   • Total Members Created: ${createdData.members.length}`);
    console.log(`   • Phase 1 Candidates: ${createdData.candidates.phase1.length}`);
    console.log(`   • Phase 2 Candidates: ${createdData.candidates.phase2.length}`);
    console.log(`   • Phase 1 Votes: ${createdData.votes.phase1.length}`);
    console.log(`   • Phase 2 Votes: ${createdData.votes.phase2.length}`);
    console.log(`   • Election ID: ${createdData.election._id}`);
    console.log(`   • Final Status: ${createdData.election.status}`);
    console.log('\n' + '='.repeat(80));
    console.log('🔍 You can now test the UI with the created election data');
    console.log(`   Election URL: http://localhost:5000/dashboard/elections/${createdData.election._id}`);
    console.log('='.repeat(80) + '\n');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n✓ Database connection closed\n');
  }
}

// Run the script
if (require.main === module) {
  runFullElectionCycle()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { runFullElectionCycle };
