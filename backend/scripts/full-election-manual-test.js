/**
 * Complete Election System Test - Manual Guided Version
 * 
 * This script will guide you through testing the entire election system
 * with step-by-step instructions.
 * 
 * Usage: node backend/scripts/full-election-manual-test.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const { connectDB } = require("../src/config/db");
const { User } = require("../src/models/User");
const { Member } = require("../src/models/Member");
const { EcTerm } = require("../src/models/EcTerm");
const { EcPost } = require("../src/models/EcPost");
const { Election } = require("../src/models/Election");
const { ElectionCandidate } = require("../src/models/ElectionCandidate");
const { Vote } = require("../src/models/Vote");

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  try {
    console.log("🎯 FULL ELECTION SYSTEM TEST GUIDE");
    console.log("="  .repeat(80));
    console.log("This guide will walk you through testing the election system.\n");

    await connectDB();
    console.log("✅ Connected to MongoDB\n");

    // Check prerequisites
    console.log("📋 STEP 1: Checking Prerequisites\n");
    
    const moderator = await User.findOne({ roles: "Moderator" });
    if (!moderator) {
      console.log("❌ No moderator found. Please create a moderator user first.");
      process.exit(1);
    }
    console.log(`✅ Moderator found: ${moderator.email}`);

    const students = await Member.find({ memberType: "Student", status: "Active" }).limit(10);
    if (students.length < 3) {
      console.log("❌ Need at least 3 active students for testing. Found:", students.length);
      process.exit(1);
    }
    console.log(`✅ Found ${students.length} active students`);

    const posts = await EcPost.find({ phase: 1, isActive: true });
    if (posts.length === 0) {
      console.log("❌ No Phase 1 EC posts found. Creating default posts...");
      // Create some default posts for testing
      await EcPost.create([
        { code: "POST-12", title: "Batch Representative 2020", displayOrder: 12, phase: 1, isActive: true },
        { code: "POST-13", title: "Batch Representative 2021", displayOrder: 13, phase: 1, isActive: true },
        { code: "POST-14", title: "Batch Representative 2022", displayOrder: 14, phase: 1, isActive: true },
      ]);
      console.log("✅ Created default EC posts");
    } else {
      console.log(`✅ Found ${posts.length} Phase 1 EC posts`);
    }

    await question("\nPress Enter to continue...");

    // Guide through UI testing
    console.log("\n" + "=".repeat(80));
    console.log("📋 STEP 2: CREATE EC TERM (Through UI)\n");
    console.log("1. Open: http://localhost:3000/dashboard/governance/ec-terms");
    console.log("2. Click 'New Term' button");
    console.log("3. Fill in:");
    console.log("   - Name: Test Election " + new Date().getFullYear());
    console.log("   - Starts: " + new Date().toISOString().split('T')[0]);
    console.log("   - Ends: " + new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0]);
    console.log("   - Status: Draft");
    console.log("4. Click 'Create Term'");
    console.log("5. Click 'Activate' button on the created term");

    await question("\nPress Enter when you've created and activated the term...");

    // Verify term was created
    const term = await EcTerm.findOne({ status: "Active" });
    if (!term) {
      console.log("❌ No active term found. Please create one through the UI.");
      process.exit(1);
    }
    console.log(`✅ Active term found: ${term.name}`);

    console.log("\n" + "=".repeat(80));
    console.log("📋 STEP 3: CREATE ELECTION (Through UI)\n");
    console.log("1. Open: http://localhost:3000/dashboard/elections");
    console.log("2. Click 'New Election' button");
    console.log("3. Fill in:");
    console.log("   - Name: Test Phase 1 Election " + new Date().getFullYear());
    console.log(`   - EC Term: ${term.name}`);
    console.log("   - Phase: Phase 1 — Batch Representatives");
    console.log("   - Starts On: " + new Date(Date.now() + 60*60*1000).toISOString().replace('T', ' ').split('.')[0]);
    console.log("   - Ends On: " + new Date(Date.now() + 7*24*60*60*1000).toISOString().replace('T', ' ').split('.')[0]);
    console.log("4. Click 'Create Election'");

    await question("\nPress Enter when you've created the election...");

    const election = await Election.findOne({ termId: term._id }).sort({ createdAt: -1 });
    if (!election) {
      console.log("❌ No election found for this term. Please create one.");
      process.exit(1);
    }
    console.log(`✅ Election found: ${election.name}`);

    console.log("\n" + "=".repeat(80));
    console.log("📋 STEP 4: ADD CANDIDATES\n");
    console.log("\nYou can add candidates in TWO ways:\n");
    console.log("A) THROUGH UI (Recommended):");
    console.log("   1. Log out and log in as a student");
    console.log(`      Use one of these students (check database for credentials):`);
    for (let i = 0; i < Math.min(3, students.length); i++) {
      const student = students[i];
      console.log(`      - Student ID: ${student.studentId} (Batch: ${student.batch})`);
    }
    console.log("   2. Go to: http://localhost:3000/dashboard/elections");
    console.log(`   3. Click on '${election.name}'`);
    console.log("   4. Click 'Candidates' or 'Apply as Candidate'");
    console.log("   5. Fill in candidate information");
    console.log("   6. Submit application");
    console.log("   7. Repeat for 2-3 different students from same batch");
    
    console.log("\nB) AUTOMATIC (Quick):");
    const auto = await question("\n   Do you want to auto-create candidates? (yes/no): ");
    
    if (auto.toLowerCase() === 'yes' || auto.toLowerCase() === 'y') {
      console.log("\n   Creating candidates automatically...");
      
      // Group students by batch
      const batchGroups = {};
      for (const student of students) {
        const batch = student.batch || "Unknown";
        if (!batchGroups[batch]) batchGroups[batch] = [];
        batchGroups[batch].push(student);
      }
      
      // Pick first batch with at least 2 students
      let selectedBatch = null;
      for (const [batch, members] of Object.entries(batchGroups)) {
        if (members.length >= 2) {
          selectedBatch = { batch, members: members.slice(0, 3) };
          break;
        }
      }
      
      if (!selectedBatch) {
        console.log("   ❌ Couldn't find a batch with 2+ students");
      } else {
        for (const student of selectedBatch.members) {
          await ElectionCandidate.create({
            electionId: election._id,
            memberId: student._id,
            phase: 1,
            batch: selectedBatch.batch,
            nominationType: "Self_Nomination",
            candidateStatement: `I ${student.userId?.firstName || 'Student'} want to represent Batch ${selectedBatch.batch}`,
            status: "Submitted",
            eligibilityChecked: true,
          });
          console.log(`   ✅ Created candidate: ${student.studentId}`);
        }
      }
    }

    await question("\nPress Enter when you've added candidates...");

    const candidates = await ElectionCandidate.find({ electionId: election._id });
    console.log(`✅ Found ${candidates.length} candidates`);

    console.log("\n" + "=".repeat(80));
    console.log("📋 STEP 5: APPROVE CANDIDATES (As Moderator)\n");
    console.log("1. Log in as moderator/election commissioner");
    console.log("2. Go to: http://localhost:3000/dashboard/elections");
    console.log(`3. Click on '${election.name}' → 'Candidates'`);
    console.log("4. Review and approve each candidate");
    console.log("   OR");
    const autoApprove = await question("   Auto-approve all candidates? (yes/no): ");
    
    if (autoApprove.toLowerCase() === 'yes' || autoApprove.toLowerCase() === 'y') {
      await ElectionCandidate.updateMany(
        { electionId: election._id },
        { status: "Approved", eligibilityChecked: true }
      );
      console.log("   ✅ All candidates approved");
    }

    console.log("\n" + "=".repeat(80));
    console.log("📋 STEP 6: ACTIVATE ELECTION (As Moderator)\n");
    console.log("1. Go to: http://localhost:3000/dashboard/elections");
    console.log(`2. Find '${election.name}'`);
    console.log("3. Click 'Activate' button");

    await question("\nPress Enter when you've activated the election...");

    console.log("\n" + "=".repeat(80));
    console.log("📋 STEP 7: CAST VOTES (As Different Students)\n");
    console.log("1. Log out and log in as different students");
    console.log("2. Go to: http://localhost:3000/dashboard/elections");
    console.log("3. Click 'Vote Now' on the active election");
    console.log("4. Select candidates (up to 5 for Phase 1)");
    console.log("5. Submit vote");
    console.log("6. Repeat with 2-3 different student accounts");

    await question("\nPress Enter when you've cast votes...");

    const votes = await Vote.countDocuments({ electionId: election._id });
    console.log(`✅ Found ${votes} vote(s) cast`);

    console.log("\n" + "=".repeat(80));
    console.log("📋 STEP 8: CLOSE ELECTION & VIEW RESULTS (As Moderator)\n");
    console.log("1. Log in as moderator");
    console.log("2. Go to: http://localhost:3000/dashboard/elections");
    console.log("3. Click 'Close' button on the election");
    console.log("4. Click 'Results' to see voting results");
    console.log("5. Optionally publish results");

    await question("\nPress Enter when done...");

    console.log("\n" + "=".repeat(80));
    console.log("📋 STEP 9: TEST DELETE FUNCTIONALITY\n");
    console.log("1. Go to: http://localhost:3000/dashboard/elections");
    console.log("2. Find a closed/draft election");
    console.log("3. Click 'Delete' button");
    console.log("4. Confirm deletion");
    console.log("5. Verify it's removed from the list");

    console.log("\n" + "=".repeat(80));
    console.log("🎉 TEST COMPLETE!\n");
    console.log("You've tested:");
    console.log("✅ EC Term creation and activation");
    console.log("✅ Election creation");
    console.log("✅ Candidate application and approval");
    console.log("✅ Election activation");
    console.log("✅ Vote casting");
    console.log("✅ Election closing and results");
    console.log("✅ Delete functionality");
    
    console.log("\n📊 Final Statistics:");
    console.log(`   Terms: ${await EcTerm.countDocuments()}`);
    console.log(`   Elections: ${await Election.countDocuments()}`);
    console.log(`   Candidates: ${await ElectionCandidate.countDocuments()}`);
    console.log(`   Votes: ${await Vote.countDocuments()}`);

  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error(error.stack);
  } finally {
    rl.close();
    await mongoose.connection.close();
    console.log("\n👋 Test guide completed");
  }
}

main();
