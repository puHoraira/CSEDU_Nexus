/**
 * Complete Election Cycle Script
 * 
 * This script automates the entire election process:
 * 1. Updates test users with proper CGPA and attendance for eligibility
 * 2. Creates an EC Term for the new executive committee
 * 3. Creates an Election linked to that term
 * 4. Runs Phase 1: Batch Representative Elections
 *    - Submits candidate applications
 *    - Approves candidates
 *    - Casts votes from all eligible voters
 *    - Publishes Phase 1 results
 * 5. Runs Phase 2: Office Bearer Elections
 *    - Phase 1 winners become Phase 2 candidates
 *    - Everyone votes again
 *    - Publishes Phase 2 results
 * 6. Creates EC appointments for winners
 * 7. Publishes the EC term on the website
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { User } = require('../src/models/User');
const { Member } = require('../src/models/Member');
const { EcTerm } = require('../src/models/EcTerm');
const { EcPost } = require('../src/models/EcPost');
const { Election } = require('../src/models/Election');
const { ElectionCandidate } = require('../src/models/ElectionCandidate');
const { Vote } = require('../src/models/Vote');
const { EcAppointment } = require('../src/models/EcAppointment');
const { EnhancedElectionService } = require('../src/services/EnhancedElectionService');
const { GovernanceService } = require('../src/services/GovernanceService');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/iplab';

// Configuration
const CONFIG = {
  minCGPA: 3.5,
  minAttendance: 75,
  termStartDate: new Date('2025-01-01'),
  termEndDate: new Date('2026-01-01'),
  phase1VotesPerVoter: 5, // Each voter can vote for 5 batch representatives
};

async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function updateTestUsersEligibility() {
  console.log('\n📝 Step 1: Updating test users with proper CGPA and attendance...');
  
  // Update all test students to have valid CGPA and attendance
  const members = await Member.find({
    studentId: /^(2020|2021|2022|2023)0(0[1-9]|10)$/
  });

  let updated = 0;
  for (const member of members) {
    // Set CGPA between 3.5 and 4.0 (randomly)
    const cgpa = (Math.random() * 0.5 + 3.5).toFixed(2);
    // Set attendance between 75% and 100%
    const attendance = Math.floor(Math.random() * 25 + 75);
    
    // Update the nested fields correctly
    await Member.findByIdAndUpdate(member._id, {
      'academicRecord.currentCgpa': parseFloat(cgpa),
      'attendanceRecord.overallAttendancePercentage': attendance,
      'disciplinaryRecord.totalActions': 0,
      'disciplinaryRecord.hasActiveDisciplinaryActions': false,
      'academicRecord.isGraduating': false
    });
    
    updated++;
  }
  
  console.log(`✅ Updated ${updated} members with valid CGPA and attendance`);
  
  // Re-fetch members with populated data
  const updatedMembers = await Member.find({
    studentId: /^(2020|2021|2022|2023)0(0[1-9]|10)$/
  }).populate('userId');
  
  return updatedMembers;
}

async function createECTerm() {
  console.log('\n📝 Step 2: Creating EC Term...');
  
  // Check if there's already an active term
  const existingTerm = await EcTerm.findOne({
    status: { $in: ['Draft', 'Active'] }
  }).sort({ createdAt: -1 });
  
  if (existingTerm) {
    console.log(`✅ Using existing EC Term: ${existingTerm.name}`);
    return existingTerm;
  }
  
  const termData = {
    name: `EC Term 2025-2026`,
    startsOn: CONFIG.termStartDate,
    endsOn: CONFIG.termEndDate,
    status: 'Draft',
    description: 'Executive Committee Term created via automated election script'
  };
  
  const term = await EcTerm.create(termData);
  console.log(`✅ Created EC Term: ${term.name} (ID: ${term._id})`);
  return term;
}

async function createElection(termId, moderatorId) {
  console.log('\n📝 Step 3: Creating Election...');
  
  const electionData = {
    name: `Annual EC Elections 2025`,
    description: 'Annual elections for executive committee positions',
    termId: termId,
    currentPhase: 1,
    status: 'Phase1_Active',
    config: {
      eligibility: {
        minCgpa: CONFIG.minCGPA,
        minAttendance: CONFIG.minAttendance,
        maxDisciplinaryActions: 0
      },
      phase1: {
        maxVotesPerVoter: CONFIG.phase1VotesPerVoter,
        eligibleBatches: ['2020', '2021', '2022', '2023']
      },
      phase2: {
        eligibleVoters: 'All_Members'
      }
    },
    phase1: {
      status: 'Voting_Active',
      candidateRegistrationStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      candidateRegistrationEnd: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      votingStart: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      votingEnd: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    },
    phase2: {
      status: 'Not_Started'
    }
  };
  
  const election = await Election.create(electionData);
  console.log(`✅ Created Election: ${election.name} (ID: ${election._id})`);
  return election;
}

async function submitPhase1Candidates(election, members) {
  console.log('\n📝 Step 4: Submitting Phase 1 Candidates...');
  
  // Group members by batch
  const batchGroups = {};
  for (const member of members) {
    const batch = member.batch;
    if (!batchGroups[batch]) batchGroups[batch] = [];
    batchGroups[batch].push(member);
  }
  
  const candidates = [];
  
  // Submit 3 candidates from each batch
  for (const [batch, batchMembers] of Object.entries(batchGroups)) {
    // Sort by CGPA and take top 3
    const eligibleMembers = batchMembers
      .filter(m => m.cgpa >= CONFIG.minCGPA && m.attendancePercentage >= CONFIG.minAttendance)
      .sort((a, b) => b.cgpa - a.cgpa)
      .slice(0, 3);
    
    console.log(`  Batch ${batch}: ${eligibleMembers.length} eligible candidates`);
    
    for (const member of eligibleMembers) {
      const candidateData = {
        electionId: election._id,
        memberId: member._id,
        phase: 1,
        batch: batch,
        candidateStatement: `I am committed to representing Batch ${batch} and working for the betterment of our club.`,
        campaignSlogan: `Vote for Progress - Batch ${batch}`,
        status: 'Approved', // Auto-approve for testing
        nominationType: 'Self_Nomination',
        eligibilityChecked: true,
        eligibilityCheckDate: new Date(),
        eligibilityDetails: {
          cgpa: member.cgpa,
          attendancePercentage: member.attendancePercentage,
          disciplinaryActions: 0
        }
      };
      
      const candidate = await ElectionCandidate.create(candidateData);
      candidates.push(candidate);
    }
  }
  
  console.log(`✅ Created ${candidates.length} Phase 1 candidates`);
  return candidates;
}

async function castPhase1Votes(election, candidates, members) {
  console.log('\n📝 Step 5: Casting Phase 1 Votes...');
  
  // Group candidates by batch
  const candidatesByBatch = {};
  for (const candidate of candidates) {
    const batch = candidate.batch;
    if (!candidatesByBatch[batch]) candidatesByBatch[batch] = [];
    candidatesByBatch[batch].push(candidate);
  }
  
  let totalVotes = 0;
  
  // Each member votes for their batch candidates
  for (const member of members) {
    const batch = member.batch;
    const batchCandidates = candidatesByBatch[batch] || [];
    
    if (batchCandidates.length === 0) continue;
    
    // Vote for random candidates (up to max votes per voter)
    const numVotes = Math.min(CONFIG.phase1VotesPerVoter, batchCandidates.length);
    const shuffled = [...batchCandidates].sort(() => Math.random() - 0.5);
    const votedCandidates = shuffled.slice(0, numVotes);
    
    for (const candidate of votedCandidates) {
      const vote = await Vote.create({
        electionId: election._id,
        candidateId: candidate._id,
        voterMemberId: member._id,
        phase: 1,
        batch: batch,
        isValid: true,
        verificationMethod: 'Student_ID',
        castAt: new Date()
      });
      totalVotes++;
    }
  }
  
  console.log(`✅ Cast ${totalVotes} Phase 1 votes`);
}

async function publishPhase1Results(election, moderatorId) {
  console.log('\n📝 Step 6: Publishing Phase 1 Results...');
  
  const result = await EnhancedElectionService.publishResults(
    election._id,
    1, // phase
    moderatorId,
    'election-script',
    false // don't auto-create appointments yet
  );
  
  console.log(`✅ Published Phase 1 results`);
  console.log(`   Batch results: ${result.results.length} batches`);
  
  for (const batchResult of result.results) {
    console.log(`   - Batch ${batchResult.batch}: ${batchResult.winners.length} winners, ${batchResult.totalVotes} total votes`);
  }
  
  return result;
}

async function getPhase1Winners(election) {
  console.log('\n📝 Step 7: Getting Phase 1 Winners...');
  
  // Get all Phase 1 candidates sorted by votes
  const candidates = await ElectionCandidate.find({
    electionId: election._id,
    phase: 1,
    status: 'Approved'
  }).populate('memberId');
  
  // Group by batch and get top 5 from each
  const batchGroups = {};
  for (const candidate of candidates) {
    const batch = candidate.batch;
    if (!batchGroups[batch]) batchGroups[batch] = [];
    batchGroups[batch].push(candidate);
  }
  
  const winners = [];
  for (const [batch, batchCandidates] of Object.entries(batchGroups)) {
    // Count votes for each candidate
    const candidateVotes = await Promise.all(
      batchCandidates.map(async (c) => ({
        candidate: c,
        votes: await Vote.countDocuments({ candidateId: c._id, phase: 1, isValid: true })
      }))
    );
    
    // Sort by votes and take top 5
    const batchWinners = candidateVotes
      .sort((a, b) => b.votes - a.votes)
      .slice(0, 5)
      .map(cv => cv.candidate);
    
    winners.push(...batchWinners);
    console.log(`   Batch ${batch}: ${batchWinners.length} winners advancing to Phase 2`);
  }
  
  console.log(`✅ Total ${winners.length} Phase 1 winners advancing to Phase 2`);
  return winners;
}

async function submitPhase2Candidates(election, phase1Winners) {
  console.log('\n📝 Step 8: Submitting Phase 2 Candidates...');
  
  // Get all EC posts
  const posts = await EcPost.find({ isActive: true }).sort({ displayOrder: 1 });
  console.log(`   Found ${posts.length} active EC posts`);
  
  const candidates = [];
  
  // For each post, select candidates from Phase 1 winners
  for (const post of posts) {
    // Skip Executive Member posts (they're assigned automatically)
    if (post.code.includes('EXECUTIVE_MEMBER')) continue;
    
    // Filter winners by post requirements
    const eligibleWinners = phase1Winners.filter(winner => {
      const member = winner.memberId;
      return member.currentYear >= post.minYear;
    });
    
    // Take 2-3 candidates per post
    const numCandidates = Math.min(3, eligibleWinners.length);
    const postCandidates = eligibleWinners.slice(0, numCandidates);
    
    for (const winner of postCandidates) {
      const candidateData = {
        electionId: election._id,
        memberId: winner.memberId._id,
        phase: 2,
        postId: post._id,
        candidateStatement: `As a Phase 1 winner, I am committed to serving as ${post.title} and working for our club's excellence.`,
        campaignSlogan: `Leadership for ${post.title}`,
        status: 'Approved',
        nominationType: 'Self_Nomination',
        eligibilityChecked: true,
        eligibilityCheckDate: new Date()
      };
      
      const candidate = await ElectionCandidate.create(candidateData);
      candidates.push(candidate);
    }
    
    console.log(`   ${post.title}: ${postCandidates.length} candidates`);
  }
  
  console.log(`✅ Created ${candidates.length} Phase 2 candidates`);
  return candidates;
}

async function castPhase2Votes(election, candidates, members) {
  console.log('\n📝 Step 9: Casting Phase 2 Votes...');
  
  // Group candidates by post
  const candidatesByPost = {};
  for (const candidate of candidates) {
    const postId = candidate.postId.toString();
    if (!candidatesByPost[postId]) candidatesByPost[postId] = [];
    candidatesByPost[postId].push(candidate);
  }
  
  let totalVotes = 0;
  
  // Each member votes once per post
  for (const member of members) {
    for (const [postId, postCandidates] of Object.entries(candidatesByPost)) {
      if (postCandidates.length === 0) continue;
      
      // Vote for a random candidate for this post
      const candidate = postCandidates[Math.floor(Math.random() * postCandidates.length)];
      
      await Vote.create({
        electionId: election._id,
        candidateId: candidate._id,
        voterMemberId: member._id,
        phase: 2,
        postId: candidate.postId,
        isValid: true,
        verificationMethod: 'Student_ID',
        castAt: new Date()
      });
      totalVotes++;
    }
  }
  
  console.log(`✅ Cast ${totalVotes} Phase 2 votes`);
}

async function publishPhase2Results(election, moderatorId) {
  console.log('\n📝 Step 10: Publishing Phase 2 Results...');
  
  const result = await EnhancedElectionService.publishResults(
    election._id,
    2, // phase
    moderatorId,
    'election-script',
    true // auto-create appointments for winners
  );
  
  console.log(`✅ Published Phase 2 results`);
  console.log(`   Post results: ${result.results.length} posts`);
  console.log(`   Created appointments: ${result.createdAppointments.length}`);
  
  if (result.appointmentErrors.length > 0) {
    console.log(`   ⚠️ Appointment errors: ${result.appointmentErrors.length}`);
  }
  
  for (const postResult of result.results) {
    console.log(`   - ${postResult.post.title}: ${postResult.winner ? 'Winner assigned' : 'No winner'}`);
  }
  
  return result;
}

async function publishECTerm(term) {
  console.log('\n📝 Step 11: Publishing EC Term...');
  
  // Update term status to Active
  term.status = 'Active';
  await term.save();
  
  console.log(`✅ EC Term "${term.name}" is now Active and published`);
  
  // Get all appointments for this term
  const appointments = await EcAppointment.find({ termId: term._id })
    .populate('memberId', 'studentId')
    .populate('postId', 'title code');
  
  console.log(`\n🎉 FINAL EC COMPOSITION (${appointments.length} members):`);
  for (const appt of appointments) {
    console.log(`   - ${appt.postId.title}: ${appt.memberId.studentId}`);
  }
}

async function main() {
  console.log('🚀 Starting Complete Election Cycle\n');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  await connectDB();
  
  try {
    // Get moderator user for performing actions
    const moderator = await User.findOne({ email: 'abuhoraira10152@gmail.com' });
    if (!moderator) {
      throw new Error('Moderator user not found. Please run seedBaseData.js first.');
    }
    console.log(`✅ Using moderator: ${moderator.email} (ID: ${moderator._id})`);
    
    // Step 1: Update test users
    const members = await updateTestUsersEligibility();
    
    // Step 2: Create EC Term
    const term = await createECTerm();
    
    // Step 3: Create Election
    const election = await createElection(term._id, moderator._id);
    
    // PHASE 1: Batch Representative Elections
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║              PHASE 1: BATCH ELECTIONS                  ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    
    // Step 4-5: Submit candidates and cast votes
    const phase1Candidates = await submitPhase1Candidates(election, members);
    await castPhase1Votes(election, phase1Candidates, members);
    
    // Step 6: Publish Phase 1 results
    await publishPhase1Results(election, moderator._id);
    
    // Step 7: Get Phase 1 winners
    const phase1Winners = await getPhase1Winners(election);
    
    // Update election to Phase 2
    election.currentPhase = 2;
    election.status = 'Phase2_Active';
    election.phase1.status = 'Completed';
    election.phase2.status = 'Voting_Active';
    election.phase2.votingStart = new Date();
    election.phase2.votingEnd = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    await election.save();
    
    // PHASE 2: Office Bearer Elections
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║            PHASE 2: OFFICE BEARER ELECTIONS            ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    
    // Step 8-9: Submit candidates and cast votes
    const phase2Candidates = await submitPhase2Candidates(election, phase1Winners);
    await castPhase2Votes(election, phase2Candidates, members);
    
    // Step 10: Publish Phase 2 results (creates appointments)
    await publishPhase2Results(election, moderator._id);
    
    // Step 11: Publish EC Term
    await publishECTerm(term);
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🎊 ELECTION CYCLE COMPLETED SUCCESSFULLY! 🎊');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`✅ EC Term: ${term.name}`);
    console.log(`✅ Election: ${election.name}`);
    console.log(`✅ Status: ${election.status}`);
    console.log(`✅ View results at: /dashboard/elections/${election._id}/results`);
    console.log(`✅ View EC members at: /governance`);
    
  } catch (error) {
    console.error('\n❌ Error during election cycle:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
}

// Run the script
main();
