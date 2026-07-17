/**
 * Fully Automated Election System Test
 * 
 * This script automatically creates and runs a complete election cycle
 * 
 * Usage: node backend/scripts/auto-full-election-test.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const { connectDB } = require("../src/config/db");
const { GovernanceService } = require("../src/services/GovernanceService");
const { EnhancedElectionService } = require("../src/services/EnhancedElectionService");
const { User } = require("../src/models/User");
const { Member } = require("../src/models/Member");
const { EcPost } = require("../src/models/EcPost");
const { ElectionCandidate } = require("../src/models/ElectionCandidate");
const { Vote } = require("../src/models/Vote");
const crypto = require("crypto");

async function main() {
  try {
    console.log("🚀 AUTOMATED FULL ELECTION SYSTEM TEST");
    console.log("="  .repeat(80));
    console.log();

    await connectDB();
    console.log("✅ Connected to MongoDB\n");

    // Step 1: Get or create moderator
    console.log("📋 STEP 1: Setting up test users");
    let moderator = await User.findOne({ roles: "Moderator" });
    if (!moderator) {
      console.log("Creating moderator user...");
      moderator = await User.create({
        email: "test-moderator@csedu.com",
        password: "TestMod123!",
        firstName: "Test",
        lastName: "Moderator",
        roles: ["Moderator"],
        isEmailVerified: true,
      });
    }
    console.log(`✅ Moderator: ${moderator.email}`);

    // Get test students
    const students = await Member.find({ 
      memberType: "Student", 
      status: "Active" 
    }).populate("userId").limit(10);

    if (students.length < 3) {
      console.log("❌ Need at least 3 active students. Found:", students.length);
      console.log("Please ensure you have student members in the database.");
      process.exit(1);
    }
    
    // Group by batch
    const batchMap = {};
    for (const student of students) {
      const batch = student.batch || "2023";
      if (!batchMap[batch]) batchMap[batch] = [];
      batchMap[batch].push(student);
    }
    
    const testBatch = Object.keys(batchMap)[0];
    const testStudents = batchMap[testBatch].slice(0, 5);
    console.log(`✅ Using ${testStudents.length} students from batch ${testBatch}`);

    // Step 2: Create EC Term
    console.log("\n📋 STEP 2: Creating EC Term");
    const termData = {
      name: `Test Election ${Date.now()}`,
      startsOn: new Date(),
      endsOn: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      status: "Active"
    };
    
    const term = await GovernanceService.createTerm(
      termData,
      moderator._id.toString(),
      `test-${Date.now()}`
    );
    console.log(`✅ Created term: ${term.name} (${term._id})`);

    // Step 3: Ensure EC Posts exist
    console.log("\n📋 STEP 3: Setting up EC Posts");
    let posts = await EcPost.find({ phase: 1, isActive: true });
    if (posts.length === 0) {
      posts = await EcPost.create([
        { code: "POST-12", title: `Batch Representative ${testBatch}`, displayOrder: 12, phase: 1, isActive: true },
        { code: "POST-13", title: "Executive Member (Post 13)", displayOrder: 13, phase: 1, isActive: true },
      ]);
      console.log(`✅ Created ${posts.length} EC posts`);
    } else {
      console.log(`✅ Found ${posts.length} existing EC posts`);
    }

    // Step 4: Create Election
    console.log("\n📋 STEP 4: Creating Election");
    const electionData = {
      name: `Automated Test Election ${Date.now()}`,
      description: "Automated test election for Phase 1",
      termId: term._id.toString(),
      targetYears: ["All_Years"],
      phase1: {
        candidateRegistrationStart: new Date(Date.now() - 24 * 60 * 60 * 1000),
        candidateRegistrationEnd: new Date(Date.now() + 24 * 60 * 60 * 1000),
        votingStart: new Date(Date.now() - 1 * 60 * 60 * 1000),
        votingEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: "Voting_Active",
        eligibleBatches: [testBatch]
      },
      currentPhase: 1,
      status: "Phase1_Active",
      usePerBatchPhase1: false,
    };

    const election = await EnhancedElectionService.createElection(
      electionData,
      moderator._id.toString(),
      `test-election-${Date.now()}`
    );
    console.log(`✅ Created election: ${election.name} (${election._id})`);

    // Step 5: Create Candidates
    console.log("\n📋 STEP 5: Creating Candidates");
    const candidates = [];
    for (let i = 0; i < Math.min(3, testStudents.length); i++) {
      const student = testStudents[i];
      
      const candidateData = {
        electionId: election._id.toString(),
        memberId: student._id.toString(),
        phase: 1,
        batch: testBatch,
        nominationType: "Self_Nomination",
        candidateStatement: `I am ${student.userId?.firstName || 'candidate'} ${i + 1}, representing batch ${testBatch}. I promise to serve our batch with dedication.`,
        campaignSlogan: `Vote for Change, Vote for ${student.userId?.firstName || 'Me'}!`,
        status: "Approved",
        eligibilityChecked: true,
      };

      const candidate = await ElectionCandidate.create(candidateData);
      candidates.push(candidate);
      console.log(`   ✅ Candidate ${i + 1}: ${student.studentId}`);
    }

    // Step 6: Cast Votes
    console.log("\n📋 STEP 6: Casting Votes");
    const voters = testStudents.slice(0, 5);
    
    for (let i = 0; i < voters.length; i++) {
      const voter = voters[i];
      
      // Each voter votes for 1-2 random candidates
      const numVotes = Math.floor(Math.random() * 2) + 1;
      const shuffledCandidates = [...candidates].sort(() => Math.random() - 0.5);
      
      for (let j = 0; j < Math.min(numVotes, candidates.length); j++) {
        const candidate = shuffledCandidates[j];
        
        const voteData = {
          electionId: election._id.toString(),
          candidateId: candidate._id.toString(),
          phase: 1,
          batch: testBatch,
        };

        try {
          await EnhancedElectionService.castVote(
            voteData,
            voter.userId._id.toString(),
            `vote-${Date.now()}-${i}-${j}`
          );
          console.log(`   ✅ Voter ${i + 1} voted for candidate ${j + 1}`);
        } catch (error) {
          // Might fail if already voted for this candidate
          console.log(`   ⚠️  Voter ${i + 1} couldn't vote for candidate ${j + 1}: ${error.message}`);
        }
      }
    }

    // Step 7: Get Statistics
    console.log("\n📋 STEP 7: Election Statistics");
    const stats = await EnhancedElectionService.getElectionStatistics(election._id.toString());
    console.log(`   Total Votes Cast: ${stats.totalVotesCast || 0}`);
    console.log(`   Total Candidates: ${stats.totalCandidates || candidates.length}`);
    console.log(`   Voter Turnout: ${stats.voterTurnoutPercentage || 0}%`);

    // Step 8: Get Results
    console.log("\n📋 STEP 8: Election Results");
    const results = await EnhancedElectionService.getResults(election._id.toString(), 1);
    
    if (results.phase1Results && results.phase1Results.length > 0) {
      console.log("\n   Phase 1 Results:");
      for (const batchResult of results.phase1Results) {
        console.log(`\n   Batch: ${batchResult.batch}`);
        console.log(`   Total Votes: ${batchResult.totalVotes}`);
        console.log(`   Voters: ${batchResult.voterTurnout}/${batchResult.eligibleVoters} (${batchResult.turnoutPercentage.toFixed(1)}%)`);
        
        if (batchResult.candidates && batchResult.candidates.length > 0) {
          console.log(`\n   Candidates:`);
          for (const cand of batchResult.candidates) {
            console.log(`      ${cand.rank}. ${cand.memberName} - ${cand.votes} votes (${cand.percentage.toFixed(1)}%)`);
          }
        }
      }
    }

    // Summary
    console.log("\n" + "="  .repeat(80));
    console.log("🎉 AUTOMATED TEST COMPLETE!\n");
    console.log("Summary:");
    console.log(`   ✅ EC Term created: ${term.name}`);
    console.log(`   ✅ Election created: ${election.name}`);
    console.log(`   ✅ Candidates added: ${candidates.length}`);
    console.log(`   ✅ Votes cast: ${await Vote.countDocuments({ electionId: election._id })}`);
    console.log(`   ✅ Results generated successfully`);
    
    console.log("\n📌 Test IDs for cleanup:");
    console.log(`   Term ID: ${term._id}`);
    console.log(`   Election ID: ${election._id}`);
    
    console.log("\n💡 Next steps:");
    console.log("   1. View election in UI: http://localhost:3000/dashboard/elections");
    console.log("   2. Test deletion of election (close it first if active)");
    console.log("   3. Test deletion of term (delete election first)");

  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log("\n👋 Disconnected from MongoDB");
  }
}

main();
