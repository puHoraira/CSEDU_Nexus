/**
 * Complete Election Simulation Script
 * 
 * Creates 300 students across 5 batches and runs a full election cycle:
 * - 60 students per batch (2020, 2021, 2022, 2023, 2024)
 * - Phase 1: 8 candidates per batch, top 5 advance
 * - Phase 2: 25 winners compete for EC posts
 * - All with proper CGPA, attendance, and hashed passwords
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { User } = require('../src/models/User');
const { Member } = require('../src/models/Member');
const { EcTerm } = require('../src/models/EcTerm');
const { EcPost } = require('../src/models/EcPost');
const { Election } = require('../src/models/Election');
const { ElectionCandidate } = require('../src/models/ElectionCandidate');
const { Vote } = require('../src/models/Vote');
const { EnhancedElectionService } = require('../src/services/EnhancedElectionService');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/iplab';

// Configuration
const BATCHES = [27, 28, 29, 30, 31]; // Recent batches: 2020-21, 2021-22, 2022-23, 2023-24, 2024-25
const STUDENTS_PER_BATCH = 60;
const CANDIDATES_PER_BATCH = 8;
const WINNERS_PER_BATCH = 5;

async function connectDB() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');
}

async function createStudents() {
  console.log('📝 Step 1: Creating 300 test students...\n');
  
  try {
    const createdStudents = [];
    let totalCreated = 0;
    
    for (const batch of BATCHES) {
      console.log(`  Creating Batch ${batch} students...`);
      
      for (let i = 1; i <= STUDENTS_PER_BATCH; i++) {
        // Calculate session year from batch (Batch 27 = 2020, Batch 28 = 2021, etc.)
        const sessionYear = 1994 + batch - 1; // Batch 27 → 2020, Batch 28 → 2021
        const studentId = `${sessionYear}${String(i).padStart(3, '0')}`; // e.g., 2020001, 2021002...
        const email = `stu-${sessionYear}${String(i).padStart(7, '0')}@cs.du.ac.bd`; // e.g., stu-20200000001@cs.du.ac.bd
        const password = 'Student@123'; // Same password for all test students
        
        // Check if user already exists
        let user = await User.findOne({ email });
        
        if (!user) {
          // Create User
          const hashedPassword = await bcrypt.hash(password, 10);
          user = await User.create({
            email,
            passwordHash: hashedPassword, // Correct field name is passwordHash
            firstName: `Student${i}`,
            lastName: `Batch${batch}`,
            roles: ['General Member'],
            isVerified: true,
            status: 'Active'
          });
          
          if (!user) {
            throw new Error(`Failed to create user: ${email}`);
          }
        }
        
        // Check if member already exists
        let member = await Member.findOne({ studentId });
        
        if (!member) {
          // Determine academic year based on batch
          // Batch 27 = 2020 session, currently in 2025 = 5 years (Masters)
          // Batch 31 = 2024 session, currently in 2025 = 1 year (First Year)
          const sessionYear = 1994 + batch - 1;
          const currentYear = Math.min(2025 - sessionYear, 5); // Years since admission
          const yearMapping = {
            1: 'First_Year',
            2: 'Second_Year',
            3: 'Third_Year',
            4: 'Fourth_Year',
            5: 'Masters'
          };
          
          // Create Member with proper nested structure
          member = await Member.create({
            userId: user._id,
            studentId,
            batch,
            currentYear: Math.max(1, currentYear),
            academicYearLevel: yearMapping[Math.max(1, currentYear)] || 'First_Year',
            session: `${sessionYear}-${String(sessionYear + 1).slice(-2)}`, // Format: "2020-21"
            admissionYear: sessionYear,
            expectedGraduationYear: sessionYear + 4,
            
            // Academic Record - random but valid
            academicRecord: {
              currentCgpa: parseFloat((Math.random() * 0.5 + 3.5).toFixed(2)), // 3.5 to 4.0
              totalCreditsCompleted: currentYear * 30,
              totalCreditsRequired: 160,
              isGraduating: false
            },
            
            // Attendance Record
            attendanceRecord: {
              overallAttendancePercentage: Math.floor(Math.random() * 26 + 75), // 75-100%
              lastUpdated: new Date()
            },
            
            // Disciplinary Record
            disciplinaryRecord: {
              totalActions: 0,
              actions: [],
              hasActiveDisciplinaryActions: false
            },
            
            status: 'Active',
            membershipType: 'Student',
            joinedAt: new Date(sessionYear, 0, 1)
          });
          
          if (!member) {
            throw new Error(`Failed to create member: ${studentId}`);
          }
          
          totalCreated++;
        }
        
        createdStudents.push({ user, member });
      }
      
      console.log(`  ✅ Batch ${batch}: ${STUDENTS_PER_BATCH} students ready`);
    }
    
    if (createdStudents.length !== 300) {
      throw new Error(`Expected 300 students but got ${createdStudents.length}`);
    }
    
    console.log(`\n✅ Total students created/verified: ${totalCreated} new, ${300 - totalCreated} existing\n`);
    return createdStudents;
  } catch (error) {
    console.error(`\n❌ FAILED at Step 1 (Creating Students): ${error.message}`);
    throw error;
  }
}

async function createECTerm() {
  console.log('📝 Step 2: Creating EC Term...\n');
  
  try {
    const term = await EcTerm.create({
      name: `EC Term 2025-2026`,
      startsOn: new Date('2025-01-01'),
      endsOn: new Date('2026-01-01'),
      status: 'Draft',
      description: 'Executive Committee Term 2025-2026 - Created via automated script'
    });
    
    if (!term || !term._id) {
      throw new Error('Failed to create EC Term');
    }
    
    console.log(`✅ Created EC Term: ${term.name} (ID: ${term._id})\n`);
    return term;
  } catch (error) {
    console.error(`\n❌ FAILED at Step 2 (Creating EC Term): ${error.message}`);
    throw error;
  }
}

async function createElection(termId, moderatorId) {
  console.log('📝 Step 3: Creating Election...\n');
  
  try {
    if (!termId) {
      throw new Error('Term ID is required to create election');
    }
    
    if (!moderatorId) {
      throw new Error('Moderator ID is required to create election');
    }
    
    const election = await Election.create({
      name: `Annual EC Elections 2025`,
      description: 'Annual elections for Executive Committee positions 2025-2026',
      termId,
      currentPhase: 1,
      status: 'Phase1_Active',
      config: {
        eligibility: {
          minCgpa: 3.5,
          minAttendance: 75,
          maxDisciplinaryActions: 0
        },
        phase1: {
          maxVotesPerVoter: WINNERS_PER_BATCH, // Each voter can vote for 5 batch reps
          eligibleBatches: BATCHES.map(String)
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
    });
    
    if (!election || !election._id) {
      throw new Error('Failed to create Election');
    }
    
    console.log(`✅ Created Election: ${election.name} (ID: ${election._id})\n`);
    return election;
  } catch (error) {
    console.error(`\n❌ FAILED at Step 3 (Creating Election): ${error.message}`);
    throw error;
  }
}

async function submitPhase1Candidates(election, students) {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║              PHASE 1: BATCH ELECTIONS                  ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  console.log('📝 Step 4: Submitting Phase 1 Candidates...\n');
  
  try {
    if (!election || !election._id) {
      throw new Error('Invalid election object');
    }
    
    if (!students || students.length === 0) {
      throw new Error('No students provided for candidate submission');
    }
    
    const candidates = [];
    
    for (const batch of BATCHES) {
      const batchStudents = students.filter(s => s.member.batch === batch);
      
      // Filter eligible students (CGPA >= 3.5, attendance >= 75%)
      const eligible = batchStudents.filter(s => 
        (s.member.academicRecord?.currentCgpa || 0) >= 3.5 &&
        (s.member.attendanceRecord?.overallAttendancePercentage || 0) >= 75 &&
        (s.member.disciplinaryRecord?.totalActions || 0) === 0
      );
      
      if (eligible.length < CANDIDATES_PER_BATCH) {
        throw new Error(`Batch ${batch} has only ${eligible.length} eligible students, need at least ${CANDIDATES_PER_BATCH}`);
      }
      
      // Pick top 8 by CGPA
      const topCandidates = eligible
        .sort((a, b) => (b.member.academicRecord?.currentCgpa || 0) - (a.member.academicRecord?.currentCgpa || 0))
        .slice(0, CANDIDATES_PER_BATCH);
      
      console.log(`  Batch ${batch}: ${topCandidates.length}/${eligible.length} eligible candidates selected`);
      
      for (const student of topCandidates) {
        const candidate = await ElectionCandidate.create({
          electionId: election._id,
          memberId: student.member._id,
          phase: 1,
          batch: String(batch),
          candidateStatement: `I am committed to representing Batch ${batch} with excellence and dedication.`,
          campaignSlogan: `Leadership for Batch ${batch}`,
          status: 'Approved',
          nominationType: 'Self_Nomination',
          eligibilityChecked: true,
          eligibilityCheckDate: new Date(),
          eligibilityDetails: {
            cgpa: student.member.academicRecord?.currentCgpa,
            attendancePercentage: student.member.attendanceRecord?.overallAttendancePercentage,
            disciplinaryActions: 0
          }
        });
        
        if (!candidate || !candidate._id) {
          throw new Error(`Failed to create candidate for student ${student.member.studentId}`);
        }
        
        candidates.push(candidate);
      }
    }
    
    const expectedCandidates = BATCHES.length * CANDIDATES_PER_BATCH;
    if (candidates.length !== expectedCandidates) {
      throw new Error(`Expected ${expectedCandidates} candidates but created ${candidates.length}`);
    }
    
    console.log(`\n✅ Created ${candidates.length} Phase 1 candidates (${CANDIDATES_PER_BATCH} per batch)\n`);
    return candidates;
  } catch (error) {
    console.error(`\n❌ FAILED at Step 4 (Submitting Phase 1 Candidates): ${error.message}`);
    throw error;
  }
}

async function castPhase1Votes(election, candidates, students) {
  console.log('📝 Step 5: Casting Phase 1 Votes...\n');
  
  try {
    let totalVotes = 0;
    
    // Group candidates by batch
    const candidatesByBatch = {};
    for (const candidate of candidates) {
      const batch = candidate.batch;
      if (!candidatesByBatch[batch]) candidatesByBatch[batch] = [];
      candidatesByBatch[batch].push(candidate);
    }
    
    // Each student votes for their batch candidates
    for (const student of students) {
      const batch = String(student.member.batch);
      const batchCandidates = candidatesByBatch[batch] || [];
      
      if (batchCandidates.length === 0) continue;
      
      // In Phase 1, voters can vote for UP TO 5 candidates, but create separate vote records for each
      // The unique index prevents duplicate (electionId + voterMemberId + phase + postId)
      // For Phase 1, postId is null, so each voter can only have ONE vote per election+phase
      // We need to pick ONE candidate per voter (not 5)
      
      const randomCandidate = batchCandidates[Math.floor(Math.random() * batchCandidates.length)];
      
      const voteHash = crypto.createHash('sha256')
        .update(`${election._id}-${student.member._id}-${randomCandidate._id}-${Date.now()}-${Math.random()}`)
        .digest('hex');
        
      await Vote.create({
        electionId: election._id,
        candidateId: randomCandidate._id,
        voterMemberId: student.member._id,
        phase: 1,
        batch: batch,
        isValid: true,
        voteHash,
        verificationMethod: 'Student_ID',
        castAt: new Date()
      });
      totalVotes++;
    }
    
    console.log(`✅ Cast ${totalVotes} Phase 1 votes\n`);
  } catch (error) {
    console.error(`\n❌ FAILED at Step 5 (Casting Phase 1 Votes): ${error.message}`);
    throw error;
  }
}

async function publishPhase1Results(election, moderatorId) {
  console.log('📝 Step 6: Publishing Phase 1 Results...\n');
  
  const result = await EnhancedElectionService.publishResults(
    election._id,
    1,
    moderatorId,
    'election-script',
    false
  );
  
  console.log(`✅ Published Phase 1 results:`);
  for (const batchResult of result.results) {
    console.log(`   - Batch ${batchResult.batch}: ${batchResult.winners?.length || 0} winners, ${batchResult.totalVotes} votes`);
  }
  console.log('');
  
  return result;
}

async function getPhase1Winners(election) {
  console.log('📝 Step 7: Identifying Phase 1 Winners...\n');
  
  const winners = [];
  
  for (const batch of BATCHES) {
    const batchCandidates = await ElectionCandidate.find({
      electionId: election._id,
      phase: 1,
      batch: String(batch),
      status: 'Approved'
    }).populate('memberId');
    
    // Count votes for each
    const candidateVotes = await Promise.all(
      batchCandidates.map(async (c) => ({
        candidate: c,
        votes: await Vote.countDocuments({ candidateId: c._id, phase: 1, isValid: true })
      }))
    );
    
    // Top 5
    const batchWinners = candidateVotes
      .sort((a, b) => b.votes - a.votes)
      .slice(0, WINNERS_PER_BATCH)
      .map(cv => cv.candidate);
    
    winners.push(...batchWinners);
    console.log(`   Batch ${batch}: Top ${batchWinners.length} advance to Phase 2`);
  }
  
  console.log(`\n✅ Total ${winners.length} Phase 1 winners advancing to Phase 2\n`);
  return winners;
}

async function submitPhase2Candidates(election, phase1Winners) {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║            PHASE 2: OFFICE BEARER ELECTIONS            ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  console.log('📝 Step 8: Submitting Phase 2 Candidates...\n');
  
  try {
    const posts = await EcPost.find({ isActive: true, code: { $not: /EXECUTIVE_MEMBER/ } }).sort({ displayOrder: 1 });
    console.log(`   Found ${posts.length} EC posts (excluding Executive Members)\n`);
    
    const candidates = [];
    const usedWinners = new Set(); // Track winners already assigned to avoid duplicates
    
    for (const post of posts) {
      // Filter winners eligible for this post and not yet used
      const eligibleWinners = phase1Winners.filter(winner => {
        const member = winner.memberId;
        const isEligible = member.currentYear >= (post.minYear || 1);
        const notUsed = !usedWinners.has(winner.memberId._id.toString());
        return isEligible && notUsed;
      });
      
      if (eligibleWinners.length === 0) {
        console.log(`   ${post.title}: No eligible candidates available`);
        continue;
      }
      
      // Assign up to 3 candidates per post (or fewer if not enough eligible)
      const numCandidates = Math.min(3, eligibleWinners.length);
      const postCandidates = eligibleWinners.slice(0, numCandidates);
      
      for (const winner of postCandidates) {
        const candidate = await ElectionCandidate.create({
          electionId: election._id,
          memberId: winner.memberId._id,
          phase: 2,
          postId: post._id,
          candidateStatement: `As a Phase 1 winner, I am ready to serve as ${post.title} with dedication and vision.`,
          campaignSlogan: `Excellence for ${post.title}`,
          status: 'Approved',
          nominationType: 'Self_Nomination',
          eligibilityChecked: true,
          eligibilityCheckDate: new Date()
        });
        
        if (!candidate || !candidate._id) {
          throw new Error(`Failed to create Phase 2 candidate for post ${post.title}`);
        }
        
        candidates.push(candidate);
        usedWinners.add(winner.memberId._id.toString()); // Mark as used
      }
      
      console.log(`   ${post.title}: ${postCandidates.length} candidates`);
    }
    
    console.log(`\n✅ Created ${candidates.length} Phase 2 candidates\n`);
    return candidates;
  } catch (error) {
    console.error(`\n❌ FAILED at Step 8 (Submitting Phase 2 Candidates): ${error.message}`);
    throw error;
  }
}

async function castPhase2Votes(election, candidates, students) {
  console.log('📝 Step 9: Casting Phase 2 Votes...\n');
  
  // Group candidates by post
  const candidatesByPost = {};
  for (const candidate of candidates) {
    const postId = candidate.postId.toString();
    if (!candidatesByPost[postId]) candidatesByPost[postId] = [];
    candidatesByPost[postId].push(candidate);
  }
  
  let totalVotes = 0;
  
  // Each student votes once per post
  for (const student of students) {
    for (const [postId, postCandidates] of Object.entries(candidatesByPost)) {
      if (postCandidates.length === 0) continue;
      
      // Pick random candidate for this post
      const candidate = postCandidates[Math.floor(Math.random() * postCandidates.length)];
      
      const voteHash = crypto.createHash('sha256')
        .update(`${election._id}-${student.member._id}-${candidate._id}-${Date.now()}`)
        .digest('hex');
      
      await Vote.create({
        electionId: election._id,
        candidateId: candidate._id,
        voterMemberId: student.member._id,
        phase: 2,
        postId: candidate.postId,
        isValid: true,
        voteHash,
        verificationMethod: 'Student_ID',
        castAt: new Date()
      });
      totalVotes++;
    }
  }
  
  console.log(`✅ Cast ${totalVotes} Phase 2 votes\n`);
}

async function publishPhase2Results(election, moderatorId) {
  console.log('📝 Step 10: Publishing Phase 2 Results...\n');
  
  const result = await EnhancedElectionService.publishResults(
    election._id,
    2,
    moderatorId,
    'election-script',
    true // Auto-create appointments
  );
  
  console.log(`✅ Published Phase 2 results:`);
  console.log(`   Posts filled: ${result.results.length}`);
  console.log(`   Appointments created: ${result.createdAppointments.length}`);
  
  if (result.appointmentErrors.length > 0) {
    console.log(`   ⚠️ Appointment errors: ${result.appointmentErrors.length}`);
    console.log(`\n   📋 Appointment Error Details:`);
    for (const error of result.appointmentErrors) {
      console.log(`      - Candidate ${error.candidateId}: ${error.reason}`);
    }
    console.log('');
  }
  
  for (const postResult of result.results) {
    const winner = postResult.winner;
    if (winner) {
      console.log(`   - ${postResult.post.title}: Winner assigned (${winner.votes} votes)`);
    } else {
      console.log(`   - ${postResult.post.title}: No winner`);
    }
  }
  console.log('');
  
  return result;
}

async function publishECTerm(term) {
  console.log('📝 Step 11: Publishing EC Term...\n');
  
  term.status = 'Active';
  await term.save();
  
  console.log(`✅ EC Term "${term.name}" is now Active and published on website\n`);
}

async function main() {
  console.log('🚀 Starting Complete Election Simulation with 300 Students\n');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  await connectDB();
  
  try {
    // Get moderator by specific email
    const moderator = await User.findOne({ email: 'abuhoraira10152@gmail.com' });
    
    if (!moderator) {
      throw new Error('Moderator user (abuhoraira10152@gmail.com) not found. Please ensure this user exists.');
    }
    
    console.log(`✅ Using moderator: ${moderator.email} (ID: ${moderator._id})\n`);
    
    // Step 1: Create 300 students
    const students = await createStudents();
    
    // Step 2: Create EC Term
    const term = await createECTerm();
    
    // Step 3: Create Election
    const election = await createElection(term._id, moderator._id);
    
    // PHASE 1
    const phase1Candidates = await submitPhase1Candidates(election, students);
    await castPhase1Votes(election, phase1Candidates, students);
    await publishPhase1Results(election, moderator._id);
    const phase1Winners = await getPhase1Winners(election);
    
    // Update election to Phase 2
    election.currentPhase = 2;
    election.status = 'Phase2_Active';
    election.phase1.status = 'Completed';
    election.phase2.status = 'Voting_Active';
    election.phase2.votingStart = new Date();
    election.phase2.votingEnd = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    await election.save();
    
    // PHASE 2
    const phase2Candidates = await submitPhase2Candidates(election, phase1Winners);
    await castPhase2Votes(election, phase2Candidates, students);
    await publishPhase2Results(election, moderator._id);
    
    // Publish Term
    await publishECTerm(term);
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎊 ELECTION COMPLETED SUCCESSFULLY! 🎊');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`✅ Students: 300 across 5 batches (Batch 27-31 = Sessions 2020-21 to 2024-25)`);
    console.log(`✅ EC Term: ${term.name} (Status: ${term.status})`);
    console.log(`✅ Election: ${election.name} (ID: ${election._id})`);
    console.log(`✅ Phase 1: ${BATCHES.length} batches × ${CANDIDATES_PER_BATCH} candidates = ${BATCHES.length * CANDIDATES_PER_BATCH} total`);
    console.log(`✅ Phase 2: ${phase1Winners.length} qualified candidates`);
    console.log(`\n📊 View results at: http://localhost:3000/dashboard/elections/${election._id}/results`);
    console.log(`📋 View EC members at: http://localhost:3000/governance\n`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
  }
}

main();
