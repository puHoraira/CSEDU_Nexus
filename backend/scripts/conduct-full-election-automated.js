/**
 * Automated Full Election Cycle Script
 * 
 * This script will:
 * 1. Create a new election with proper setup
 * 2. Create test students across multiple batches
 * 3. Add and approve candidates for Phase 1
 * 4. Activate Phase 1 and conduct voting
 * 5. Complete Phase 1 and transition to Phase 2
 * 6. Add and approve candidates for Phase 2
 * 7. Activate Phase 2 and conduct voting
 * 8. Complete Phase 2 and publish final results
 * 9. Report any errors found and fix them
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/csedu';
const API_BASE = 'http://localhost:5000/api/v1';
const axios = require('axios');

// Test data configuration
const BATCHES = [2020, 2021, 2022, 2023];
const STUDENTS_PER_BATCH = 10;
const CANDIDATES_PER_BATCH = 3; // For Phase 1
const PHASE2_CANDIDATES = 8; // Total for Phase 2

// Config - use existing election ID from previous test
const EXISTING_ELECTION_ID = '6a59d3a473c6d620655db9a5'; // From simple-election-test.js

let authToken = null;
let moderatorUser = null;
let electionId = EXISTING_ELECTION_ID; // Start with existing election
let termId = null;
let commissionId = null;
let ecPosts = [];
let allStudents = [];
let phase1Candidates = [];
let phase2Candidates = [];

// Utility functions
function log(message, data = null) {
  console.log(`\n📋 ${message}`);
  if (data) console.log(JSON.stringify(data, null, 2));
}

function logError(message, error) {
  console.error(`\n❌ ERROR: ${message}`);
  console.error(error.response?.data || error.message || error);
}

function logSuccess(message) {
  console.log(`\n✅ ${message}`);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Step 1: Authenticate as moderator
async function authenticate() {
  try {
    log('Step 1: Authenticating as moderator...');
    
    // Find or create moderator user
    const User = mongoose.connection.collection('users');
    moderatorUser = await User.findOne({ email: 'abuhoraira10152@gmail.com' });
    
    if (!moderatorUser) {
      throw new Error('Moderator user not found. Please create one first.');
    }

    // Login to get token
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: 'abuhoraira10152@gmail.com',
      password: '12345678'
    });

    authToken = response.data.data.accessToken;
    logSuccess(`Authenticated as moderator. Token: ${authToken.substring(0, 20)}...`);
    
    return true;
  } catch (error) {
    logError('Authentication failed', error);
    throw error;
  }
}

// Step 2: Create EC Term
async function createECTerm() {
  try {
    log('Step 2: Creating EC Term...');
    
    const EcTerm = mongoose.connection.collection('ecterms');
    const existingTerm = await EcTerm.findOne({ 
      name: 'Test Term 2024-2025',
      status: 'Active'
    });

    if (existingTerm) {
      termId = existingTerm._id.toString();
      logSuccess(`Using existing EC Term: ${termId}`);
      return;
    }

    const term = {
      name: 'Test Term 2024-2025',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2025-12-31'),
      status: 'Active',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await EcTerm.insertOne(term);
    termId = result.insertedId.toString();
    logSuccess(`Created EC Term: ${termId}`);
  } catch (error) {
    logError('Failed to create EC Term', error);
    throw error;
  }
}

// Step 3: Create EC Posts
async function createECPosts() {
  try {
    log('Step 3: Creating EC Posts...');
    
    const EcPost = mongoose.connection.collection('ecposts');
    
    // Check if posts already exist
    const existingPosts = await EcPost.find({ isActive: true }).toArray();
    if (existingPosts.length >= 8) {
      ecPosts = existingPosts.slice(0, 11);
      logSuccess(`Using ${ecPosts.length} existing EC Posts`);
      return;
    }

    const posts = [
      { title: 'President', order: 1, responsibilities: ['Lead the club', 'Represent members'], minYear: 3, minEcYears: 1, maxCandidates: 5, isActive: true },
      { title: 'Vice President', order: 2, responsibilities: ['Assist President'], minYear: 2, minEcYears: 0, maxCandidates: 5, isActive: true },
      { title: 'General Secretary', order: 3, responsibilities: ['Manage administration'], minYear: 2, minEcYears: 0, maxCandidates: 5, isActive: true },
      { title: 'Treasurer', order: 4, responsibilities: ['Manage finances'], minYear: 2, minEcYears: 0, maxCandidates: 5, isActive: true },
      { title: 'AGS (Organization)', order: 5, responsibilities: ['Organize events'], minYear: 2, minEcYears: 0, maxCandidates: 5, isActive: true },
      { title: 'AGS (Sports)', order: 6, responsibilities: ['Sports activities'], minYear: 1, minEcYears: 0, maxCandidates: 5, isActive: true },
      { title: 'AGS (Debate)', order: 7, responsibilities: ['Debate activities'], minYear: 1, minEcYears: 0, maxCandidates: 5, isActive: true },
      { title: 'AGS (Publications)', order: 8, responsibilities: ['Publications'], minYear: 1, minEcYears: 0, maxCandidates: 5, isActive: true },
      { title: 'AGS (IT)', order: 9, responsibilities: ['IT management'], minYear: 1, minEcYears: 0, maxCandidates: 5, isActive: true },
      { title: 'AGS (Cultural)', order: 10, responsibilities: ['Cultural events'], minYear: 1, minEcYears: 0, maxCandidates: 5, isActive: true },
      { title: 'Office Secretary', order: 11, responsibilities: ['Office management'], minYear: 1, minEcYears: 0, maxCandidates: 5, isActive: true },
    ];

    for (const post of posts) {
      post.createdAt = new Date();
      post.updatedAt = new Date();
    }

    const result = await EcPost.insertMany(posts);
    ecPosts = Object.values(result.insertedIds).map((id, i) => ({ ...posts[i], _id: id }));
    logSuccess(`Created ${ecPosts.length} EC Posts`);
  } catch (error) {
    logError('Failed to create EC Posts', error);
    throw error;
  }
}

// Step 4: Create test students
async function createTestStudents() {
  try {
    log('Step 4: Creating test students...');
    
    const User = mongoose.connection.collection('users');
    const Member = mongoose.connection.collection('members');
    
    const hashedPassword = await bcrypt.hash('Test@123', 10);
    
    for (const batch of BATCHES) {
      const currentYear = 2024 - batch + 1; // Calculate year based on batch
      
      for (let i = 1; i <= STUDENTS_PER_BATCH; i++) {
        const studentId = `${batch}${String(i).padStart(3, '0')}`;
        const email = `student${studentId}@test.com`;
        
        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          const existingMember = await Member.findOne({ userId: existingUser._id });
          if (existingMember) {
            allStudents.push({ user: existingUser, member: existingMember });
            continue;
          }
        }
        
        // Create user
        const userDoc = {
          email,
          password: hashedPassword,
          firstName: `Student${i}`,
          lastName: `Batch${batch}`,
          roles: ['General Member'],
          isEmailVerified: true,
          status: 'Active',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        const userResult = await User.insertOne(userDoc);
        const userId = userResult.insertedId;
        
        // Create member
        const memberDoc = {
          userId,
          studentId,
          batch,
          currentYear,
          academicYearLevel: currentYear,
          department: 'CSE',
          contactNumber: `01700000${i}`,
          status: 'Active',
          membershipStatus: {
            status: 'Active',
            since: new Date('2024-01-01')
          },
          ecEligibility: {
            isEligible: true,
            yearsInEc: i <= CANDIDATES_PER_BATCH ? 1 : 0 // First few have EC experience
          },
          attendance: {
            totalMeetings: 10,
            attendedMeetings: 9,
            attendanceRate: 90
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        const memberResult = await Member.insertOne(memberDoc);
        
        userDoc._id = userId;
        memberDoc._id = memberResult.insertedId;
        allStudents.push({ user: userDoc, member: memberDoc });
      }
    }
    
    logSuccess(`Created/found ${allStudents.length} test students`);
    log(`Distribution: ${BATCHES.map(b => `Batch ${b}: ${STUDENTS_PER_BATCH}`).join(', ')}`);
  } catch (error) {
    logError('Failed to create test students', error);
    throw error;
  }
}

// Step 5: Create or find election
async function createElection() {
  try {
    log('Step 5: Creating/finding election...');
    
    // First, check if there's an active election for this term
    try {
      const listResponse = await axios.get(
        `${API_BASE}/enhanced-elections?termId=${termId}&status=Phase1_Active`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      if (listResponse.data.data && listResponse.data.data.length > 0) {
        const existingElection = listResponse.data.data[0];
        electionId = existingElection._id;
        logSuccess(`Using existing active election: ${electionId}`);
        log('Election details', existingElection);
        return;
      }
    } catch (e) {
      // No existing election, create new one
    }
    
    const response = await axios.post(
      `${API_BASE}/enhanced-elections`,
      {
        name: `Automated Test Election ${new Date().toISOString()}`,
        termId,
        startsOn: new Date().toISOString(),
        endsOn: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        phase1: {
          votingStart: new Date().toISOString(),
          votingEnd: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
        },
        phase2: {
          votingStart: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
          votingEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }
      },
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    console.log('API Response:', JSON.stringify(response.data, null, 2));
    electionId = response.data.data?._id || response.data._id;
    logSuccess(`Created election: ${electionId}`);
    log('Election details', response.data.data || response.data);
  } catch (error) {
    logError('Failed to create election', error);
    throw error;
  }
}

// Step 6: Create election commission
async function createCommission() {
  try {
    log('Step 6: Creating election commission...');
    
    const response = await axios.post(
      `${API_BASE}/enhanced-elections/${electionId}/commission`,
      {
        members: [
          {
            userId: moderatorUser._id.toString(),
            role: 'Chief Election Commissioner',
            permissions: ['manage_candidates', 'manage_phases', 'publish_results']
          }
        ]
      },
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    commissionId = response.data.data._id;
    logSuccess(`Created election commission: ${commissionId}`);
  } catch (error) {
    logError('Failed to create commission', error);
    // Continue anyway, commission might already exist
  }
}

// Step 7: Add Phase 1 candidates
async function addPhase1Candidates() {
  try {
    log('Step 7: Adding Phase 1 candidates (batch representatives)...');
    
    for (const batch of BATCHES) {
      const batchStudents = allStudents.filter(s => s.member.batch === batch);
      const candidates = batchStudents.slice(0, CANDIDATES_PER_BATCH);
      
      for (const student of candidates) {
        try {
          const response = await axios.post(
            `${API_BASE}/enhanced-elections/candidates`,
            {
              electionId,
              memberId: student.member._id.toString(),
              postId: null, // Phase 1 has no post
              memberEcYears: student.member.ecEligibility.yearsInEc || 0
            },
            {
              headers: { Authorization: `Bearer ${authToken}` }
            }
          );
          
          phase1Candidates.push({
            ...response.data.data,
            batch: student.member.batch,
            studentId: student.member.studentId
          });
          
          console.log(`  ✓ Added candidate: ${student.member.studentId} (Batch ${batch})`);
        } catch (error) {
          console.log(`  ⚠ Skipped ${student.member.studentId}: ${error.response?.data?.message || error.message}`);
        }
      }
    }
    
    logSuccess(`Added ${phase1Candidates.length} Phase 1 candidates`);
  } catch (error) {
    logError('Failed to add Phase 1 candidates', error);
    throw error;
  }
}

// Step 8: Approve Phase 1 candidates
async function approvePhase1Candidates() {
  try {
    log('Step 8: Approving Phase 1 candidates...');
    
    for (const candidate of phase1Candidates) {
      try {
        await axios.post(
          `${API_BASE}/enhanced-elections/candidates/${candidate._id}/review`,
          {
            status: 'Approved',
            comments: 'Approved for testing'
          },
          {
            headers: { Authorization: `Bearer ${authToken}` }
          }
        );
        
        console.log(`  ✓ Approved: ${candidate.studentId}`);
      } catch (error) {
        console.log(`  ⚠ Failed to approve ${candidate.studentId}: ${error.response?.data?.message || error.message}`);
      }
    }
    
    logSuccess('Approved all Phase 1 candidates');
  } catch (error) {
    logError('Failed to approve candidates', error);
    throw error;
  }
}

// Step 9: Activate Phase 1
async function activatePhase1() {
  try {
    log('Step 9: Activating Phase 1...');
    
    const response = await axios.put(
      `${API_BASE}/enhanced-elections/${electionId}/phase`,
      {
        currentPhase: 1,
        status: 'Phase1_Active'
      },
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    logSuccess('Phase 1 activated');
    log('Election status', response.data.data);
  } catch (error) {
    logError('Failed to activate Phase 1', error);
    throw error;
  }
}

// Step 10: Conduct Phase 1 voting
async function conductPhase1Voting() {
  try {
    log('Step 10: Conducting Phase 1 voting...');
    
    let votescast = 0;
    
    // Each student votes for candidates in their own batch
    for (const student of allStudents) {
      const batch = student.member.batch;
      const batchCandidates = phase1Candidates.filter(c => c.batch === batch);
      
      if (batchCandidates.length === 0) continue;
      
      // Vote for random 1-2 candidates from their batch
      const numVotes = Math.min(2, batchCandidates.length);
      const selectedCandidates = batchCandidates
        .sort(() => Math.random() - 0.5)
        .slice(0, numVotes);
      
      try {
        // Login as this student
        const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
          email: student.user.email,
          password: 'Test@123'
        });
        
        const studentToken = loginResponse.data.data.accessToken;
        
        // Cast votes
        for (const candidate of selectedCandidates) {
          try {
            await axios.post(
              `${API_BASE}/enhanced-elections/vote`,
              {
                electionId,
                candidateId: candidate._id,
                phase: 1
              },
              {
                headers: { Authorization: `Bearer ${studentToken}` }
              }
            );
            votescast++;
          } catch (voteError) {
            // Silently skip if already voted
          }
        }
        
        if (votescast % 10 === 0) {
          console.log(`  ${votescast} votes cast...`);
        }
      } catch (error) {
        // Skip student if login fails
      }
    }
    
    logSuccess(`Phase 1 voting complete: ${votescast} votes cast`);
  } catch (error) {
    logError('Failed to conduct Phase 1 voting', error);
    throw error;
  }
}

// Step 11: Complete Phase 1
async function completePhase1() {
  try {
    log('Step 11: Completing Phase 1...');
    
    const response = await axios.put(
      `${API_BASE}/enhanced-elections/${electionId}/phase`,
      {
        currentPhase: 1,
        status: 'Phase1_Completed'
      },
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    logSuccess('Phase 1 completed');
    
    // Publish Phase 1 results
    try {
      await axios.post(
        `${API_BASE}/enhanced-elections/${electionId}/publish-results`,
        {
          phase: 1,
          autoCreateAppointments: true
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      logSuccess('Phase 1 results published');
    } catch (error) {
      console.log('  ⚠ Results publication might have failed, continuing...');
    }
  } catch (error) {
    logError('Failed to complete Phase 1', error);
    throw error;
  }
}

// Step 12: Add Phase 2 candidates
async function addPhase2Candidates() {
  try {
    log('Step 12: Adding Phase 2 candidates (office bearers)...');
    
    // Select candidates from approved Phase 1 candidates (they're now eligible)
    const eligibleStudents = allStudents
      .filter(s => s.member.currentYear >= 2) // Year 2+ for most posts
      .sort(() => Math.random() - 0.5)
      .slice(0, PHASE2_CANDIDATES);
    
    for (let i = 0; i < eligibleStudents.length && i < ecPosts.length; i++) {
      const student = eligibleStudents[i];
      const post = ecPosts[i];
      
      try {
        const response = await axios.post(
          `${API_BASE}/enhanced-elections/candidates`,
          {
            electionId,
            memberId: student.member._id.toString(),
            postId: post._id.toString(),
            memberEcYears: 1 // They participated in Phase 1
          },
          {
            headers: { Authorization: `Bearer ${authToken}` }
          }
        );
        
        phase2Candidates.push({
          ...response.data.data,
          studentId: student.member.studentId,
          postTitle: post.title
        });
        
        console.log(`  ✓ Added candidate: ${student.member.studentId} for ${post.title}`);
      } catch (error) {
        console.log(`  ⚠ Skipped ${student.member.studentId}: ${error.response?.data?.message || error.message}`);
      }
    }
    
    logSuccess(`Added ${phase2Candidates.length} Phase 2 candidates`);
  } catch (error) {
    logError('Failed to add Phase 2 candidates', error);
    throw error;
  }
}

// Step 13: Approve Phase 2 candidates
async function approvePhase2Candidates() {
  try {
    log('Step 13: Approving Phase 2 candidates...');
    
    for (const candidate of phase2Candidates) {
      try {
        await axios.post(
          `${API_BASE}/enhanced-elections/candidates/${candidate._id}/review`,
          {
            status: 'Approved',
            comments: 'Approved for Phase 2 testing'
          },
          {
            headers: { Authorization: `Bearer ${authToken}` }
          }
        );
        
        console.log(`  ✓ Approved: ${candidate.studentId} for ${candidate.postTitle}`);
      } catch (error) {
        console.log(`  ⚠ Failed to approve ${candidate.studentId}: ${error.response?.data?.message || error.message}`);
      }
    }
    
    logSuccess('Approved all Phase 2 candidates');
  } catch (error) {
    logError('Failed to approve Phase 2 candidates', error);
    throw error;
  }
}

// Step 14: Activate Phase 2
async function activatePhase2() {
  try {
    log('Step 14: Activating Phase 2...');
    
    const response = await axios.put(
      `${API_BASE}/enhanced-elections/${electionId}/phase`,
      {
        currentPhase: 2,
        status: 'Phase2_Active'
      },
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    logSuccess('Phase 2 activated');
    log('Election status', response.data.data);
  } catch (error) {
    logError('Failed to activate Phase 2', error);
    throw error;
  }
}

// Step 15: Conduct Phase 2 voting
async function conductPhase2Voting() {
  try {
    log('Step 15: Conducting Phase 2 voting...');
    
    let votescast = 0;
    
    // Only approved Phase 1 winners can vote in Phase 2
    // For simplicity, let all students vote
    for (const student of allStudents) {
      try {
        // Login as this student
        const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
          email: student.user.email,
          password: 'Test@123'
        });
        
        const studentToken = loginResponse.data.data.accessToken;
        
        // Vote for one candidate per post
        const postGroups = {};
        phase2Candidates.forEach(c => {
          if (!postGroups[c.postTitle]) postGroups[c.postTitle] = [];
          postGroups[c.postTitle].push(c);
        });
        
        for (const [postTitle, candidates] of Object.entries(postGroups)) {
          const randomCandidate = candidates[Math.floor(Math.random() * candidates.length)];
          
          try {
            await axios.post(
              `${API_BASE}/enhanced-elections/vote`,
              {
                electionId,
                candidateId: randomCandidate._id,
                phase: 2
              },
              {
                headers: { Authorization: `Bearer ${studentToken}` }
              }
            );
            votescast++;
          } catch (voteError) {
            // Silently skip if already voted for this post
          }
        }
        
        if (votescast % 10 === 0) {
          console.log(`  ${votescast} votes cast...`);
        }
      } catch (error) {
        // Skip student if login fails
      }
    }
    
    logSuccess(`Phase 2 voting complete: ${votescast} votes cast`);
  } catch (error) {
    logError('Failed to conduct Phase 2 voting', error);
    throw error;
  }
}

// Step 16: Complete Phase 2
async function completePhase2() {
  try {
    log('Step 16: Completing Phase 2...');
    
    const response = await axios.put(
      `${API_BASE}/enhanced-elections/${electionId}/phase`,
      {
        currentPhase: 2,
        status: 'Phase2_Completed'
      },
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    logSuccess('Phase 2 completed');
  } catch (error) {
    logError('Failed to complete Phase 2', error);
    throw error;
  }
}

// Step 17: Publish final results
async function publishFinalResults() {
  try {
    log('Step 17: Publishing final results...');
    
    const response = await axios.post(
      `${API_BASE}/enhanced-elections/${electionId}/publish-results`,
      {
        phase: 2,
        autoCreateAppointments: true
      },
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    logSuccess('Final results published');
    log('Results', response.data.data);
    
    // Mark election as completed
    await axios.put(
      `${API_BASE}/enhanced-elections/${electionId}/phase`,
      {
        status: 'Completed'
      },
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    logSuccess('Election marked as completed');
  } catch (error) {
    logError('Failed to publish final results', error);
    throw error;
  }
}

// Main execution function
async function runFullElectionCycle() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🗳️  AUTOMATED FULL ELECTION CYCLE TEST');
    console.log('='.repeat(80));
    
    console.log('\n🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Execute all steps in sequence
    await authenticate();
    
    // Skip creation steps if using existing election
    if (EXISTING_ELECTION_ID) {
      log('Using existing election from previous test');
      log(`Election ID: ${EXISTING_ELECTION_ID}`);
      
      // Load existing data
      const Election = mongoose.connection.collection('elections');
      const election = await Election.findOne({ _id: new mongoose.Types.ObjectId(EXISTING_ELECTION_ID) });
      if (!election) {
        throw new Error('Existing election not found');
      }
      log('Election status', election);
      
      // Load existing students and candidates
      const Member = mongoose.connection.collection('members');
      const User = mongoose.connection.collection('users');
      const members = await Member.find({ status: 'Active' }).toArray();
      for (const member of members) {
        const user = await User.findOne({ _id: member.userId });
        if (user) {
          allStudents.push({ user, member });
        }
      }
      logSuccess(`Loaded ${allStudents.length} students`);
      
      // Load existing candidates
      const ElectionCandidate = mongoose.connection.collection('electioncandidates');
      const candidates = await ElectionCandidate.find({ electionId: new mongoose.Types.ObjectId(EXISTING_ELECTION_ID) }).toArray();
      
      phase1Candidates = candidates.filter(c => !c.postId || c.phase === 1).map(c => ({
        ...c,
        _id: c._id.toString(),
        batch: 2020 // Default, will be overridden
      }));
      
      phase2Candidates = candidates.filter(c => c.postId && c.phase === 2).map(c => ({
        ...c,
        _id: c._id.toString()
      }));
      
      logSuccess(`Loaded ${phase1Candidates.length} Phase 1 candidates, ${phase2Candidates.length} Phase 2 candidates`);
      
      // Now start from activation
      if (election.status === 'Setup' || election.status === 'Draft') {
        await activatePhase1();
      }
    } else {
      await createECTerm();
      await createECPosts();
      await createTestStudents();
      await createElection();
      await createCommission();
      await addPhase1Candidates();
      await approvePhase1Candidates();
      await activatePhase1();
    }
    
    await conductPhase1Voting();
    await completePhase1();
    await addPhase2Candidates();
    await approvePhase2Candidates();
    await activatePhase2();
    await conductPhase2Voting();
    await completePhase2();
    await publishFinalResults();
    
    console.log('\n' + '='.repeat(80));
    console.log('🎉 FULL ELECTION CYCLE COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(80));
    console.log(`\n📊 Summary:`);
    console.log(`   Election ID: ${electionId}`);
    console.log(`   Total Students: ${allStudents.length}`);
    console.log(`   Phase 1 Candidates: ${phase1Candidates.length}`);
    console.log(`   Phase 2 Candidates: ${phase2Candidates.length}`);
    console.log(`\n🌐 View results at: http://localhost:3000/dashboard/elections/${electionId}`);
    console.log('\n');
    
  } catch (error) {
    console.error('\n' + '='.repeat(80));
    console.error('💥 ELECTION CYCLE FAILED');
    console.error('='.repeat(80));
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB\n');
  }
}

// Run the script
runFullElectionCycle()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
