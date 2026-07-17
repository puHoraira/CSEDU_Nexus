/**
 * Simple Direct Election Test
 * ============================
 * Conducts a complete election using direct database access and service calls
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

const MODERATOR_EMAIL = 'abuhoraira10152@gmail.com';
const ADMIN_EMAIL = 'abuhoraira10153@gmail.com';
const TEST_PASSWORD = '12345678';
const BATCHES = [2020, 2021, 2022, 2023];
const USERS_PER_BATCH = 10;

let state = {
  users: [],
  members: [],
  moderator: null,
  admin: null,
  term: null,
  posts: [],
  election: null,
  commission: null,
  candidates: { phase1: [], phase2: [] }
};

function log(message, data = null) {
  console.log(`\n✓ ${message}`);
  if (data) console.log(JSON.stringify(data, null, 2));
}

async function connect() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/iplab');
  log('Connected to database');
}

async function setupUsers() {
  log('Loading existing test users...');
  
  state.moderator = await User.findOne({ email: MODERATOR_EMAIL });
  state.admin = await User.findOne({ email: ADMIN_EMAIL });
  
  if (!state.moderator || !state.admin) {
    throw new Error('Moderator or Admin not found');
  }
  
  // Use existing test users that were created before
  for (const batch of BATCHES) {
    // Find existing users for this batch
    const batchUsers = await User.find({ 
      email: { $regex: `test${batch}\\..*@` } 
    }).limit(USERS_PER_BATCH);
    
    if (batchUsers.length > 0) {
      // Use existing users
      for (const user of batchUsers) {
        const member = await Member.findOne({ userId: user._id });
        if (member) {
          state.users.push({ user, member, batch });
          state.members.push(member);
        }
      }
    } else {
      // Create new users only if none exist for this batch
      const hash = await bcrypt.hash(TEST_PASSWORD, 10);
      
      for (let i = 1; i <= USERS_PER_BATCH; i++) {
        const studentId = `${batch}01${String(i).padStart(3, '0')}`;
        const email = `test${batch}.${i}@test.ac.bd`;
        
        let user = await User.findOne({ email });
        if (!user) {
          user = await User.create({
            email, passwordHash: hash,
            firstName: `Test${i}`, lastName: `Batch${batch}`,
            roles: ['General Member'], emailVerified: true, isActive: true
          });
        }
        
        let member = await Member.findOne({ userId: user._id });
        if (!member) {
          member = await Member.create({
            userId: user._id, studentId, batch,
            currentYear: 2024 - batch + 1, department: 'CS',
            cgpa: 3.0 + Math.random(), attendancePercentage: 80 + Math.random() * 15,
            status: 'Active', membershipStatus: { status: 'Active' },
            disciplinaryActions: 0, isGraduating: batch === 2020
          });
        }
        
        state.users.push({ user, member, batch });
        state.members.push(member);
      }
    }
  }
  
  log(`Loaded ${state.users.length} users from ${BATCHES.length} batches`);
}

async function setupTermAndPosts() {
  state.term = await EcTerm.findOne({ status: 'Active' });
  if (!state.term) {
    state.term = await EcTerm.create({
      name: 'Test Term 2024-25',
      startsOn: new Date(),
      endsOn: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      status: 'Active',
      createdBy: state.admin._id
    });
  }
  
  state.posts = await EcPost.find({ isActive: true }).sort({ displayOrder: 1 });
  log(`Using term: ${state.term.name}, ${state.posts.length} posts`);
}

async function createElection() {
  // Clean up old test elections
  await Election.deleteMany({ name: /^Test Election/ });
  
  state.election = await Election.create({
    name: 'Test Election ' + new Date().toISOString(),
    description: 'Automated test',
    termId: state.term._id,
    status: 'Draft',
    currentPhase: 0,
    config: {
      allowSelfNomination: true,
      eligibility: { minCgpa: 2.5, minAttendance: 75, maxDisciplinaryActions: 0 }
    },
    phase1: {
      name: 'Batch Representative Election',
      status: 'Not_Started',
      maxVotesPerVoter: 5,
      eligibleBatches: BATCHES.map(String)
    },
    phase2: {
      name: 'Office Bearer Election',
      status: 'Not_Started',
      eligibleVoters: 'All_Members'
    }
  });
  
  log('Election created', { id: state.election._id });
}

async function createCommission() {
  const commissioners = state.users.slice(0, 2);
  
  state.commission = await ElectionCommission.create({
    electionId: state.election._id,
    termId: state.term._id,
    chiefCommissioner: state.moderator._id,
    commissioners: commissioners.map(u => ({
      userId: u.user._id,
      role: 'Commissioner',
      appointedBy: state.admin._id
    })),
    electionConfig: {
      candidateRegistrationDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      campaignStartDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
      campaignEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      minCgpaForCandidacy: 2.5,
      minAttendanceForVoting: 75
    },
    status: 'Active',
    formedAt: new Date()
  });
  
  state.election.commissionId = state.commission._id;
  state.election.supervisedBy = state.moderator._id;
  await state.election.save();
  
  log('Commission formed');
}

async function submitPhase1Candidates() {
  log('Submitting Phase 1 candidates...');
  
  for (const batch of BATCHES) {
    const batchUsers = state.users.filter(u => u.batch === batch);
    const candidateCount = Math.min(7, batchUsers.length);
    
    for (let i = 0; i < candidateCount; i++) {
      const candidate = await ElectionCandidate.create({
        electionId: state.election._id,
        memberId: batchUsers[i].member._id,
        phase: 1,
        batch,
        candidateStatement: `Representing Batch ${batch}`,
        campaignSlogan: `Vote Batch ${batch}!`,
        nominationType: 'Self_Nomination',
        status: 'Submitted',
        submittedAt: new Date()
      });
      
      state.candidates.phase1.push(candidate);
    }
  }
  
  log(`Submitted ${state.candidates.phase1.length} Phase 1 candidates`);
}

async function approvePhase1Candidates() {
  log('Approving Phase 1 candidates...');
  
  for (const candidate of state.candidates.phase1) {
    candidate.status = 'Approved';
    candidate.reviewedBy = state.moderator._id;
    candidate.reviewedAt = new Date();
    candidate.eligibilityChecked = true;
    await candidate.save();
  }
  
  log('All Phase 1 candidates approved');
}

async function openPhase1() {
  state.election.status = 'Phase1_Active';
  state.election.currentPhase = 1;
  state.election.phase1.status = 'Voting_Active';
  state.election.phase1.votingStart = new Date();
  state.election.phase1.votingEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await state.election.save();
  
  log('Phase 1 voting opened');
}

async function castPhase1Votes() {
  log('Casting Phase 1 votes...');
  
  let totalVotes = 0;
  
  for (const user of state.users) {
    const batchCandidates = state.candidates.phase1.filter(c => c.batch === user.batch && c.status === 'Approved');
    if (batchCandidates.length === 0) continue;
    
    const voteCount = Math.min(5, batchCandidates.length);
    
    for (let i = 0; i < voteCount; i++) {
      await Vote.create({
        electionId: state.election._id,
        voterMemberId: user.member._id,
        candidateId: batchCandidates[i]._id,
        phase: 1,
        batch: user.batch,
        voteType: 'Regular',
        voterVerified: true,
        verificationMethod: 'Student_ID',
        isValid: true,
        castAt: new Date()
      });
      totalVotes++;
    }
  }
  
  log(`Cast ${totalVotes} Phase 1 votes`);
}

async function closePhase1() {
  state.election.status = 'Phase1_Completed';
  state.election.phase1.status = 'Completed';
  state.election.phase1.resultsPublishedAt = new Date();
  await state.election.save();
  
  log('Phase 1 completed');
}

async function submitPhase2Candidates() {
  log('Submitting Phase 2 candidates...');
  
  const officePosts = state.posts.filter(p => p.displayOrder <= 11);
  
  for (const post of officePosts) {
    const eligible = state.members.filter(m => 
      m.currentYear >= (post.minYear || 1) && m.cgpa >= 3.0 && !m.isGraduating
    );
    
    const count = Math.min(3, eligible.length);
    
    for (let i = 0; i < count; i++) {
      const candidate = await ElectionCandidate.create({
        electionId: state.election._id,
        memberId: eligible[i]._id,
        phase: 2,
        postId: post._id,
        candidateStatement: `Committed to ${post.title}`,
        campaignSlogan: `Leadership!`,
        nominationType: 'Self_Nomination',
        status: 'Approved', // Auto-approve for test
        reviewedBy: state.moderator._id,
        reviewedAt: new Date(),
        submittedAt: new Date()
      });
      
      state.candidates.phase2.push(candidate);
    }
  }
  
  log(`Submitted ${state.candidates.phase2.length} Phase 2 candidates`);
}

async function openPhase2() {
  state.election.status = 'Phase2_Active';
  state.election.currentPhase = 2;
  state.election.phase2.status = 'Voting_Active';
  state.election.phase2.votingStart = new Date();
  state.election.phase2.votingEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await state.election.save();
  
  log('Phase 2 voting opened');
}

async function castPhase2Votes() {
  log('Casting Phase 2 votes...');
  
  let totalVotes = 0;
  const officePosts = state.posts.filter(p => p.displayOrder <= 11);
  
  for (const user of state.users) {
    for (const post of officePosts) {
      const postCandidates = state.candidates.phase2.filter(
        c => c.postId && c.postId.toString() === post._id.toString() && c.status === 'Approved'
      );
      
      if (postCandidates.length === 0) continue;
      
      await Vote.create({
        electionId: state.election._id,
        voterMemberId: user.member._id,
        candidateId: postCandidates[0]._id,
        phase: 2,
        postId: post._id,
        voteType: 'Regular',
        voterVerified: true,
        verificationMethod: 'Student_ID',
        isValid: true,
        castAt: new Date()
      });
      totalVotes++;
    }
  }
  
  log(`Cast ${totalVotes} Phase 2 votes`);
}

async function closePhase2() {
  state.election.status = 'Completed';
  state.election.phase2.status = 'Completed';
  state.election.phase2.resultsPublishedAt = new Date();
  state.election.finalResultsPublishedAt = new Date();
  state.election.finalResultsPublishedBy = state.moderator._id;
  await state.election.save();
  
  log('Phase 2 completed - Election finished!');
}

async function run() {
  try {
    console.log('\n🗳️  SIMPLE ELECTION TEST\n' + '='.repeat(50));
    
    await connect();
    await setupUsers();
    await setupTermAndPosts();
    await createElection();
    await createCommission();
    
    console.log('\n📍 PHASE 1: BATCH REPRESENTATIVES\n' + '='.repeat(50));
    await submitPhase1Candidates();
    await approvePhase1Candidates();
    await openPhase1();
    await castPhase1Votes();
    await closePhase1();
    
    console.log('\n📍 PHASE 2: OFFICE BEARERS\n' + '='.repeat(50));
    await submitPhase2Candidates();
    await openPhase2();
    await castPhase2Votes();
    await closePhase2();
    
    console.log('\n✅ SUCCESS!\n' + '='.repeat(50));
    console.log(`Election ID: ${state.election._id}`);
    console.log(`URL: http://localhost:5000/dashboard/elections/${state.election._id}`);
    console.log('='.repeat(50) + '\n');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

if (require.main === module) {
  run().then(() => process.exit(0));
}
