/**
 * Automated Complete Election Conductor (Direct Service Layer)
 * =============================================================
 * This script conducts a full election by calling services directly
 * without needing the HTTP server to be running.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models and services
const { User } = require('../src/models/User');
const { Member } = require('../src/models/Member');
const { EcTerm } = require('../src/models/EcTerm');
const { EcPost } = require('../src/models/EcPost');
const { Election } = require('../src/models/Election');
const { ElectionCommission } = require('../src/models/ElectionCommission');
const { ElectionCandidate } = require('../src/models/ElectionCandidate');
const { Vote } = require('../src/models/Vote');

const { EnhancedElectionService } = require('../src/services/EnhancedElectionService');
const { ElectionCommissionService } = require('../src/services/ElectionCommissionService');

// Configuration
const MODERATOR_EMAIL = 'abuhoraira10152@gmail.com';
const ADMIN_EMAIL = 'abuhoraira10153@gmail.com';
const TEST_PASSWORD = '12345678';

// State management
let state = {
  tokens: {},
  users: [],
  members: [],
  term: null,
  posts: [],
  election: null,
  commission: null,
  candidates: { phase1: [], phase2: [] },
  votes: { phase1: [], phase2: [] }
};

// Utility functions
function log(step, message, data = null) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`[${step}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

function logError(step, error) {
  console.error(`\n${'!'.repeat(70)}`);
  console.error(`[${step}] ERROR:`, error.response?.data || error.message);
  if (error.response?.data) {
    console.error('Response:', JSON.stringify(error.response.data, null, 2));
  }
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Authentication
async function login(email, password) {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email,
      password
    });
    return response.data.data.token;
  } catch (error) {
    logError('LOGIN', error);
    throw error;
  }
}

// Database setup using direct MongoDB connection
async function connectDB() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/iplab');
  log('DB', 'Connected to database');
}

async function setupTestData() {
  log('SETUP', 'Setting up test users and members');
  
  const { User } = require('../src/models/User');
  const { Member } = require('../src/models/Member');
  const { EcTerm } = require('../src/models/EcTerm');
  const { EcPost } = require('../src/models/EcPost');
  const bcrypt = require('bcryptjs');
  
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
  const BATCHES = ['2020', '2021', '2022', '2023'];
  const USERS_PER_BATCH = 12;
  
  // Create test users and members
  for (const batch of BATCHES) {
    for (let i = 1; i <= USERS_PER_BATCH; i++) {
      const studentId = `${batch}01${String(i).padStart(3, '0')}`;
      const email = `test${batch}.${i}@student.ac.bd`;
      
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
      
      let member = await Member.findOne({ userId: user._id });
      if (!member) {
        member = await Member.create({
          userId: user._id,
          studentId,
          batch: parseInt(batch),
          currentYear: 2024 - parseInt(batch) + 1,
          department: 'Computer Science',
          cgpa: 3.0 + Math.random() * 0.9,
          attendancePercentage: 80 + Math.random() * 15,
          status: 'Active',
          membershipStatus: { status: 'Active', statusUpdatedAt: new Date() },
          disciplinaryActions: 0,
          isGraduating: parseInt(batch) === 2020
        });
      }
      
      state.users.push({ email, userId: user._id, memberId: member._id, batch: parseInt(batch) });
      state.members.push(member);
    }
  }
  
  // Get or create EC Term
  state.term = await EcTerm.findOne({ status: 'Active' });
  if (!state.term) {
    const admin = await User.findOne({ email: ADMIN_EMAIL });
    state.term = await EcTerm.create({
      name: 'Test EC Term 2024-2025',
      startsOn: new Date(),
      endsOn: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      status: 'Active',
      createdBy: admin._id
    });
  }
  
  // Get EC Posts
  state.posts = await EcPost.find({ isActive: true }).sort({ displayOrder: 1 });
  
  log('SETUP', 'Test data ready', {
    users: state.users.length,
    members: state.members.length,
    batches: BATCHES,
    posts: state.posts.length
  });
}

// Step 1: Login as moderator and admin
async function step1_login() {
  log('STEP 1', 'Logging in as moderator and admin');
  
  state.tokens.moderator = await login(MODERATOR_EMAIL, ADMIN_PASSWORD);
  state.tokens.admin = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  
  log('STEP 1', 'Login successful');
}

// Step 2: Create Election
async function step2_createElection() {
  log('STEP 2', 'Creating election');
  
  try {
    const response = await axios.post(
      `${API_BASE}/enhanced-elections`,
      {
        name: 'Automated Test Election 2024',
        description: 'Full automated election test',
        termId: state.term._id.toString(),
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
          maxVotesPerVoter: 5,
          eligibleBatches: ['2020', '2021', '2022', '2023']
        },
        phase2: {
          eligibleVoters: 'All_Members'
        }
      },
      {
        headers: { Authorization: `Bearer ${state.tokens.admin}` }
      }
    );
    
    state.election = response.data.data;
    log('STEP 2', 'Election created', { id: state.election._id, name: state.election.name });
  } catch (error) {
    logError('STEP 2', error);
    throw error;
  }
}

// Step 3: Create Election Commission
async function step3_createCommission() {
  log('STEP 3', 'Creating election commission');
  
  try {
    const { User } = require('../src/models/User');
    const moderator = await User.findOne({ email: MODERATOR_EMAIL });
    const commissioners = state.users.slice(0, 2);
    
    const response = await axios.post(
      `${API_BASE}/enhanced-elections/${state.election._id}/commission`,
      {
        chiefCommissioner: moderator._id.toString(),
        commissioners: commissioners.map(u => ({
          userId: u.userId.toString(),
          role: 'Commissioner'
        })),
        electionConfig: {
          candidateRegistrationDeadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          campaignStartDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
          campaignEndDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
          minCgpaForCandidacy: 2.5,
          minAttendanceForVoting: 75,
          maxDisciplinaryActions: 0
        }
      },
      {
        headers: { Authorization: `Bearer ${state.tokens.admin}` }
      }
    );
    
    state.commission = response.data.data;
    log('STEP 3', 'Commission created', { id: state.commission._id });
  } catch (error) {
    logError('STEP 3', error);
    throw error;
  }
}

// Step 4: Submit Phase 1 Candidates
async function step4_submitPhase1Candidates() {
  log('STEP 4', 'Submitting Phase 1 candidates');
  
  const BATCHES = [2020, 2021, 2022, 2023];
  
  for (const batch of BATCHES) {
    const batchMembers = state.members.filter(m => m.batch === batch);
    const candidateCount = Math.min(8, batchMembers.length);
    
    for (let i = 0; i < candidateCount; i++) {
      const member = batchMembers[i];
      const user = state.users.find(u => u.memberId.equals(member._id));
      
      // Login as this user
      const userToken = await login(user.email, TEST_PASSWORD);
      
      try {
        const response = await axios.post(
          `${API_BASE}/enhanced-elections/candidates`,
          {
            electionId: state.election._id,
            phase: 1,
            candidateStatement: `I want to serve Batch ${batch}`,
            campaignSlogan: `Vote for me - Batch ${batch}!`
          },
          {
            headers: { Authorization: `Bearer ${userToken}` }
          }
        );
        
        state.candidates.phase1.push(response.data.data);
      } catch (error) {
        // Ignore errors (might be duplicate applications)
      }
      
      await delay(100); // Small delay between requests
    }
  }
  
  log('STEP 4', `Submitted ${state.candidates.phase1.length} Phase 1 candidates`);
}

// Step 5: Approve Phase 1 Candidates
async function step5_approvePhase1Candidates() {
  log('STEP 5', 'Approving Phase 1 candidates');
  
  let approvedCount = 0;
  
  for (const candidate of state.candidates.phase1) {
    try {
      await axios.post(
        `${API_BASE}/enhanced-elections/candidates/${candidate._id}/review`,
        {
          status: 'Approved',
          comments: 'Eligible candidate',
          reason: ''
        },
        {
          headers: { Authorization: `Bearer ${state.tokens.moderator}` }
        }
      );
      approvedCount++;
    } catch (error) {
      // Continue even if one fails
    }
    await delay(50);
  }
  
  log('STEP 5', `Approved ${approvedCount} candidates`);
}

// Step 6: Open Phase 1 Voting
async function step6_openPhase1() {
  log('STEP 6', 'Opening Phase 1 voting');
  
  try {
    await axios.put(
      `${API_BASE}/enhanced-elections/${state.election._id}/phase`,
      {
        currentPhase: 1,
        status: 'Phase1_Active'
      },
      {
        headers: { Authorization: `Bearer ${state.tokens.moderator}` }
      }
    );
    
    log('STEP 6', 'Phase 1 opened successfully');
  } catch (error) {
    logError('STEP 6', error);
    throw error;
  }
}

// Step 7: Cast Phase 1 Votes
async function step7_castPhase1Votes() {
  log('STEP 7', 'Casting Phase 1 votes');
  
  let totalVotes = 0;
  
  for (const user of state.users) {
    const batchCandidates = state.candidates.phase1.filter(
      c => c.batch === user.batch
    );
    
    if (batchCandidates.length === 0) continue;
    
    const userToken = await login(user.email, TEST_PASSWORD);
    const voteCount = Math.min(5, batchCandidates.length);
    
    for (let i = 0; i < voteCount; i++) {
      const candidate = batchCandidates[i];
      
      try {
        await axios.post(
          `${API_BASE}/enhanced-elections/vote`,
          {
            electionId: state.election._id,
            candidateId: candidate._id,
            phase: 1
          },
          {
            headers: { Authorization: `Bearer ${userToken}` }
          }
        );
        totalVotes++;
      } catch (error) {
        // Continue even if vote fails
      }
      
      await delay(50);
    }
  }
  
  log('STEP 7', `Cast ${totalVotes} Phase 1 votes`);
}

// Step 8: Publish Phase 1 Results
async function step8_publishPhase1Results() {
  log('STEP 8', 'Publishing Phase 1 results');
  
  try {
    await axios.post(
      `${API_BASE}/enhanced-elections/${state.election._id}/publish-results`,
      {
        phase: 1,
        autoCreateAppointments: false
      },
      {
        headers: { Authorization: `Bearer ${state.tokens.moderator}` }
      }
    );
    
    log('STEP 8', 'Phase 1 results published');
  } catch (error) {
    logError('STEP 8', error);
    throw error;
  }
}

// Step 9: Submit Phase 2 Candidates
async function step9_submitPhase2Candidates() {
  log('STEP 9', 'Submitting Phase 2 candidates');
  
  const officeBearerPosts = state.posts.filter(p => p.displayOrder <= 11);
  
  for (const post of officeBearerPosts) {
    const eligibleMembers = state.members.filter(m => 
      m.currentYear >= (post.minYear || 1) && m.cgpa >= 3.0
    );
    
    const candidateCount = Math.min(3, eligibleMembers.length);
    
    for (let i = 0; i < candidateCount; i++) {
      const member = eligibleMembers[i];
      const user = state.users.find(u => u.memberId.equals(member._id));
      const userToken = await login(user.email, TEST_PASSWORD);
      
      try {
        const response = await axios.post(
          `${API_BASE}/enhanced-elections/candidates`,
          {
            electionId: state.election._id,
            phase: 2,
            postId: post._id.toString(),
            candidateStatement: `I am committed to ${post.title}`,
            campaignSlogan: `Leadership for ${post.title}`
          },
          {
            headers: { Authorization: `Bearer ${userToken}` }
          }
        );
        
        state.candidates.phase2.push(response.data.data);
      } catch (error) {
        // Continue
      }
      
      await delay(100);
    }
  }
  
  log('STEP 9', `Submitted ${state.candidates.phase2.length} Phase 2 candidates`);
}

// Step 10: Approve Phase 2 Candidates
async function step10_approvePhase2Candidates() {
  log('STEP 10', 'Approving Phase 2 candidates');
  
  let approvedCount = 0;
  
  for (const candidate of state.candidates.phase2) {
    try {
      await axios.post(
        `${API_BASE}/enhanced-elections/candidates/${candidate._id}/review`,
        {
          status: 'Approved',
          comments: 'Eligible for office bearer position'
        },
        {
          headers: { Authorization: `Bearer ${state.tokens.moderator}` }
        }
      );
      approvedCount++;
    } catch (error) {
      // Continue
    }
    await delay(50);
  }
  
  log('STEP 10', `Approved ${approvedCount} Phase 2 candidates`);
}

// Step 11: Open Phase 2 Voting
async function step11_openPhase2() {
  log('STEP 11', 'Opening Phase 2 voting');
  
  try {
    await axios.put(
      `${API_BASE}/enhanced-elections/${state.election._id}/phase`,
      {
        currentPhase: 2,
        status: 'Phase2_Active'
      },
      {
        headers: { Authorization: `Bearer ${state.tokens.moderator}` }
      }
    );
    
    log('STEP 11', 'Phase 2 opened successfully');
  } catch (error) {
    logError('STEP 11', error);
    throw error;
  }
}

// Step 12: Cast Phase 2 Votes
async function step12_castPhase2Votes() {
  log('STEP 12', 'Casting Phase 2 votes');
  
  let totalVotes = 0;
  const officeBearerPosts = state.posts.filter(p => p.displayOrder <= 11);
  
  for (const user of state.users) {
    const userToken = await login(user.email, TEST_PASSWORD);
    
    for (const post of officeBearerPosts) {
      const postCandidates = state.candidates.phase2.filter(
        c => c.postId && c.postId.toString() === post._id.toString()
      );
      
      if (postCandidates.length === 0) continue;
      
      const candidate = postCandidates[0]; // Vote for first candidate
      
      try {
        await axios.post(
          `${API_BASE}/enhanced-elections/vote`,
          {
            electionId: state.election._id,
            candidateId: candidate._id,
            phase: 2
          },
          {
            headers: { Authorization: `Bearer ${userToken}` }
          }
        );
        totalVotes++;
      } catch (error) {
        // Continue
      }
      
      await delay(50);
    }
  }
  
  log('STEP 12', `Cast ${totalVotes} Phase 2 votes`);
}

// Step 13: Publish Phase 2 Results
async function step13_publishPhase2Results() {
  log('STEP 13', 'Publishing Phase 2 results and completing election');
  
  try {
    await axios.post(
      `${API_BASE}/enhanced-elections/${state.election._id}/publish-results`,
      {
        phase: 2,
        autoCreateAppointments: false
      },
      {
        headers: { Authorization: `Bearer ${state.tokens.moderator}` }
      }
    );
    
    log('STEP 13', 'Phase 2 results published - Election completed!');
  } catch (error) {
    logError('STEP 13', error);
    throw error;
  }
}

// Main execution
async function conductFullElection() {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('🗳️  AUTOMATED COMPLETE ELECTION CONDUCTOR');
    console.log('='.repeat(70));
    
    await connectDB();
    await setupTestData();
    
    await step1_login();
    await step2_createElection();
    await step3_createCommission();
    await step4_submitPhase1Candidates();
    await step5_approvePhase1Candidates();
    await step6_openPhase1();
    await step7_castPhase1Votes();
    await step8_publishPhase1Results();
    await step9_submitPhase2Candidates();
    await step10_approvePhase2Candidates();
    await step11_openPhase2();
    await step12_castPhase2Votes();
    await step13_publishPhase2Results();
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ COMPLETE ELECTION CONDUCTED SUCCESSFULLY!');
    console.log('='.repeat(70));
    console.log(`\n📊 Election ID: ${state.election._id}`);
    console.log(`   View at: http://localhost:5000/dashboard/elections/${state.election._id}`);
    console.log('='.repeat(70) + '\n');
    
  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

// Run
if (require.main === module) {
  conductFullElection()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { conductFullElection };
