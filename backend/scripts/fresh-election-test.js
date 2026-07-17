const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI;
const API_BASE = 'http://localhost:5000/api/v1';

const BATCHES = [2020, 2021, 2022, 2023];
const STUDENTS_PER_BATCH = 10;
const TEST_PASSWORD = 'Test@123';

let authToken = null;
let electionId = null;
let termId = null;

console.log('\n🗳️  FRESH ELECTION TEST - Starting from scratch\n');
console.log('='.repeat(70));

// Step 1: Login as moderator
async function authenticate() {
  console.log('\n📋 Step 1: Authenticating as moderator...');
  const response = await axios.post(`${API_BASE}/auth/login`, {
    email: 'abuhoraira10152@gmail.com',
    password: '12345678'
  });
  authToken = response.data.data.accessToken;
  console.log(`✅ Authenticated. Token: ${authToken.substring(0, 20)}...`);
}

// Step 2: Get or create EC Term
async function getOrCreateTerm() {
  console.log('\n📋 Step 2: Getting/Creating EC Term...');
  await mongoose.connect(MONGODB_URI);
  const EcTerm = mongoose.connection.collection('ecterms');
  
  // Create a new term for fresh testing
  const result = await EcTerm.insertOne({
    name: `Fresh Test Term ${Date.now()}`,
    year: 2027,
    startsOn: new Date('2027-01-01'),
    endsOn: new Date('2027-12-31'),
    status: 'Active',
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  termId = result.insertedId.toString();
  console.log(`✅ Created new EC Term: ${termId}`);
}

// Step 3: Create fresh election
async function createElection() {
  console.log('\n📋 Step 3: Creating fresh election...');
  
  const response = await axios.post(
    `${API_BASE}/enhanced-elections`,
    {
      name: `Fresh Test Election ${new Date().toISOString()}`,
      description: 'Fresh automated test - from scratch',
      termId,
      config: {
        eligibility: {
          minCgpa: 2.5,
          minAttendance: 75,
          maxDisciplinaryActions: 0,
          excludeGraduating: false
        }
      }
    },
    { headers: { Authorization: `Bearer ${authToken}` } }
  );
  
  electionId = response.data.data._id;
  console.log(`✅ Created election: ${electionId}`);
}

// Step 4: Get EC Posts
async function getECPosts() {
  console.log('\n📋 Step 4: Getting EC Posts...');
  const EcPost = mongoose.connection.collection('ecposts');
  const posts = await EcPost.find({ isActive: true }).sort({ displayOrder: 1 }).limit(8).toArray();
  console.log(`✅ Found ${posts.length} active posts`);
  return posts;
}

// Step 5: Add Phase 1 candidates
async function addPhase1Candidates() {
  console.log('\n📋 Step 5: Adding Phase 1 candidates...');
  
  const Member = mongoose.connection.collection('members');
  const candidates = [];
  
  for (const batch of BATCHES) {
    const batchMembers = await Member.find({ 
      batch, 
      'membershipStatus.status': 'Active' 
    }).limit(3).toArray();
    
    console.log(`\n   Batch ${batch}: Adding ${batchMembers.length} candidates`);
    
    for (const member of batchMembers) {
      try {
        const response = await axios.post(
          `${API_BASE}/enhanced-elections/candidates`,
          {
            electionId,
            memberId: member._id.toString(),
            postId: null, // Phase 1 has no post
            phase: 1
          },
          { headers: { Authorization: `Bearer ${authToken}` } }
        );
        
        candidates.push(response.data.data);
        console.log(`      ✓ Added: ${member.studentId}`);
      } catch (error) {
        console.log(`      ⚠ Failed: ${member.studentId} - ${error.response?.data?.message || error.message}`);
      }
    }
  }
  
  console.log(`\n✅ Added ${candidates.length} Phase 1 candidates`);
  return candidates;
}

// Step 6: Approve Phase 1 candidates
async function approveCandidates(candidates) {
  console.log('\n📋 Step 6: Approving Phase 1 candidates...');
  
  for (const candidate of candidates) {
    try {
      await axios.post(
        `${API_BASE}/enhanced-elections/candidates/${candidate._id}/review`,
        {
          status: 'Approved',
          comments: 'Approved for testing'
        },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      console.log(`   ✓ Approved: ${candidate._id}`);
    } catch (error) {
      console.log(`   ⚠ Failed to approve: ${error.response?.data?.message || error.message}`);
    }
  }
  
  console.log(`✅ Approved all candidates`);
}

// Step 7: Activate Phase 1
async function activatePhase1() {
  console.log('\n📋 Step 7: Activating Phase 1...');
  
  await axios.put(
    `${API_BASE}/enhanced-elections/${electionId}/phase`,
    {
      currentPhase: 1,
      status: 'Phase1_Active'
    },
    { headers: { Authorization: `Bearer ${authToken}` } }
  );
  
  console.log(`✅ Phase 1 activated`);
}

// Step 8: Conduct Phase 1 voting
async function conductPhase1Voting(candidates) {
  console.log('\n📋 Step 8: Conducting Phase 1 voting...');
  
  const User = mongoose.connection.collection('users');
  const Member = mongoose.connection.collection('members');
  
  let votescast = 0;
  
  for (const batch of BATCHES) {
    const batchMembers = await Member.find({ 
      batch,
      'membershipStatus.status': 'Active'
    }).toArray();
    
    const batchCandidates = candidates.filter(c => {
      // Get member to check batch
      return true; // For now, allow all
    });
    
    console.log(`\n   Batch ${batch}: ${batchMembers.length} voters, ${batchCandidates.length} candidates`);
    
    for (const member of batchMembers) {
      try {
        const user = await User.findOne({ _id: member.userId });
        if (!user) continue;
        
        // Login as student
        const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
          email: user.email,
          password: TEST_PASSWORD
        });
        
        const studentToken = loginResponse.data.data.accessToken;
        
        // Vote for up to 2 random candidates
        const selectedCandidates = batchCandidates
          .sort(() => Math.random() - 0.5)
          .slice(0, 2);
        
        for (const candidate of selectedCandidates) {
          try {
            await axios.post(
              `${API_BASE}/enhanced-elections/vote`,
              {
                electionId,
                candidateId: candidate._id,
                phase: 1
              },
              { headers: { Authorization: `Bearer ${studentToken}` } }
            );
            votescast++;
          } catch (voteError) {
            // Skip if already voted
          }
        }
        
        if (votescast % 10 === 0 && votescast > 0) {
          console.log(`      ${votescast} votes cast...`);
        }
      } catch (error) {
        // Skip student if login fails
      }
    }
  }
  
  console.log(`\n✅ Phase 1 voting complete: ${votescast} votes cast`);
  return votescast;
}

// Step 9: Complete Phase 1
async function completePhase1() {
  console.log('\n📋 Step 9: Completing Phase 1...');
  
  await axios.put(
    `${API_BASE}/enhanced-elections/${electionId}/phase`,
    {
      currentPhase: 1,
      status: 'Phase1_Completed'
    },
    { headers: { Authorization: `Bearer ${authToken}` } }
  );
  
  console.log(`✅ Phase 1 completed`);
  
  // Publish Phase 1 results
  try {
    await axios.post(
      `${API_BASE}/enhanced-elections/${electionId}/publish-results`,
      {
        phase: 1,
        autoCreateAppointments: false
      },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    console.log(`✅ Phase 1 results published`);
  } catch (error) {
    console.log(`⚠ Results publication error:`, error.response?.data?.message || error.message);
  }
}

// Step 10: Get Phase 1 results
async function getPhase1Results() {
  console.log('\n📋 Step 10: Getting Phase 1 results...');
  
  const response = await axios.get(
    `${API_BASE}/enhanced-elections/${electionId}/results?phase=1`,
    { headers: { Authorization: `Bearer ${authToken}` } }
  );
  
  const results = response.data.data;
  console.log(`\n   Phase 1 Results:`);
  
  if (results.phase1 && results.phase1.length > 0) {
    for (const batchResult of results.phase1) {
      console.log(`\n   Batch ${batchResult.batch}:`);
      console.log(`      Total Votes: ${batchResult.totalVotes || 0}`);
      console.log(`      Winners: ${batchResult.winners?.length || 0}`);
    }
  } else {
    console.log(`   No results found yet`);
  }
  
  return results;
}

// Main execution
async function main() {
  try {
    await authenticate();
    await getOrCreateTerm();
    await createElection();
    const posts = await getECPosts();
    const candidates = await addPhase1Candidates();
    await approveCandidates(candidates);
    await activatePhase1();
    const votesCount = await conductPhase1Voting(candidates);
    await completePhase1();
    const results = await getPhase1Results();
    
    console.log('\n' + '='.repeat(70));
    console.log('\n🎉 FRESH ELECTION TEST COMPLETED!\n');
    console.log(`Summary:`);
    console.log(`   Election ID: ${electionId}`);
    console.log(`   Phase 1 Candidates: ${candidates.length}`);
    console.log(`   Phase 1 Votes Cast: ${votesCount}`);
    console.log(`\n🌐 View at: http://localhost:3000/dashboard/elections/${electionId}\n`);
    
  } catch (error) {
    console.error('\n💥 Error:', error.response?.data || error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB\n');
  }
}

main();
