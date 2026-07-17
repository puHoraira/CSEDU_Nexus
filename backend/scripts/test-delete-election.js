/**
 * Test script for election and term deletion functionality
 * 
 * Usage: node backend/scripts/test-delete-election.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const { connectDB } = require("../src/config/db");
const { EnhancedElectionService } = require("../src/services/EnhancedElectionService");
const { EcTermService } = require("../src/services/EcTermService");
const { Election } = require("../src/models/Election");
const { EcTerm } = require("../src/models/EcTerm");
const { User } = require("../src/models/User");

async function main() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await connectDB();
    console.log("✅ Connected to MongoDB\n");

    // Find a moderator user for authorization
    const moderator = await User.findOne({ roles: "Moderator" });
    if (!moderator) {
      console.log("❌ No moderator user found. Please create one first.");
      process.exit(1);
    }

    console.log(`👤 Using moderator: ${moderator.email}\n`);

    // Test 1: Create a test term
    console.log("📋 Test 1: Creating a test term...");
    const testTerm = await EcTermService.createTerm(
      {
        name: "Test Term for Deletion",
        startsOn: new Date("2025-01-01"),
        endsOn: new Date("2025-12-31"),
        status: "Draft"
      },
      moderator._id.toString()
    );
    console.log(`✅ Created test term: ${testTerm.name} (${testTerm._id})\n`);

    // Test 2: Get term statistics
    console.log("📊 Test 2: Getting term statistics...");
    const termStats = await EcTermService.getTermStatistics(testTerm._id.toString());
    console.log("Term Statistics:");
    console.log(`  - Total Elections: ${termStats.statistics.totalElections}`);
    console.log(`  - Total Appointments: ${termStats.statistics.totalAppointments}`);
    console.log(`  - Is Deletable: ${termStats.statistics.isDeletable}\n`);

    // Test 3: Try to delete term without elections (should succeed)
    console.log("🗑️  Test 3: Deleting term without elections...");
    const termDeleteResult = await EcTermService.deleteTerm(
      testTerm._id.toString(),
      moderator._id.toString()
    );
    console.log(`✅ ${termDeleteResult.message}`);
    console.log(`   Deleted at: ${termDeleteResult.stats.deletedAt}\n`);

    // Verify term is deleted
    const deletedTerm = await EcTerm.findById(testTerm._id);
    if (!deletedTerm) {
      console.log("✅ Term successfully removed from database\n");
    } else {
      console.log("❌ Term still exists in database\n");
    }

    // Test 4: Create term with election and try to delete
    console.log("📋 Test 4: Creating term with election...");
    const termWithElection = await EcTermService.createTerm(
      {
        name: "Test Term with Election",
        startsOn: new Date("2025-06-01"),
        endsOn: new Date("2026-05-31"),
        status: "Draft"
      },
      moderator._id.toString()
    );
    console.log(`✅ Created term: ${termWithElection.name} (${termWithElection._id})`);

    // Create a simple election for this term
    const testElection = await EnhancedElectionService.createElection(
      {
        name: "Test Election for Deletion",
        description: "This is a test election",
        termId: termWithElection._id.toString(),
        targetYears: ["All_Years"]
      },
      moderator._id.toString(),
      "test-request-001"
    );
    console.log(`✅ Created test election: ${testElection.name} (${testElection._id})\n`);

    // Test 5: Try to delete term with election (should fail)
    console.log("🗑️  Test 5: Attempting to delete term with existing election...");
    try {
      await EcTermService.deleteTerm(
        termWithElection._id.toString(),
        moderator._id.toString()
      );
      console.log("❌ Term deletion should have failed but succeeded\n");
    } catch (error) {
      console.log(`✅ Term deletion correctly prevented: ${error.message}\n`);
    }

    // Test 6: Delete the election
    console.log("🗑️  Test 6: Deleting election...");
    const electionDeleteResult = await EnhancedElectionService.deleteElection(
      testElection._id.toString(),
      moderator._id.toString(),
      "test-request-002"
    );
    console.log(`✅ ${electionDeleteResult.message}`);
    console.log("   Cascaded deletes:");
    console.log(`   - Votes: ${electionDeleteResult.stats.cascadedDeletes.votes}`);
    console.log(`   - Vote Recordings: ${electionDeleteResult.stats.cascadedDeletes.voteRecordings}`);
    console.log(`   - Candidates: ${electionDeleteResult.stats.cascadedDeletes.candidates}`);
    console.log(`   - Nominations: ${electionDeleteResult.stats.cascadedDeletes.nominations}`);
    console.log(`   - Disputes: ${electionDeleteResult.stats.cascadedDeletes.disputes}\n`);

    // Verify election is deleted
    const deletedElection = await Election.findById(testElection._id);
    if (!deletedElection) {
      console.log("✅ Election successfully removed from database\n");
    } else {
      console.log("❌ Election still exists in database\n");
    }

    // Test 7: Now delete the term (should succeed)
    console.log("🗑️  Test 7: Deleting term after election removal...");
    const finalTermDelete = await EcTermService.deleteTerm(
      termWithElection._id.toString(),
      moderator._id.toString()
    );
    console.log(`✅ ${finalTermDelete.message}\n`);

    // Test 8: Try to delete an active election (should fail)
    console.log("📋 Test 8: Creating active election to test deletion prevention...");
    const activeTerm = await EcTermService.createTerm(
      {
        name: "Active Election Term",
        startsOn: new Date("2025-03-01"),
        endsOn: new Date("2025-12-31"),
        status: "Draft"
      },
      moderator._id.toString()
    );

    const activeElection = await EnhancedElectionService.createElection(
      {
        name: "Active Election",
        description: "This election is active",
        termId: activeTerm._id.toString(),
        targetYears: ["All_Years"],
        status: "Phase1_Active"
      },
      moderator._id.toString(),
      "test-request-003"
    );

    // Manually set to active status
    await Election.findByIdAndUpdate(activeElection._id, { status: "Phase1_Active" });

    console.log("🗑️  Test 8: Attempting to delete active election...");
    try {
      await EnhancedElectionService.deleteElection(
        activeElection._id.toString(),
        moderator._id.toString(),
        "test-request-004"
      );
      console.log("❌ Active election deletion should have failed but succeeded\n");
    } catch (error) {
      console.log(`✅ Active election deletion correctly prevented: ${error.message}\n`);
    }

    // Cleanup: Set to draft and delete
    await Election.findByIdAndUpdate(activeElection._id, { status: "Draft" });
    await EnhancedElectionService.deleteElection(
      activeElection._id.toString(),
      moderator._id.toString(),
      "test-request-005"
    );
    await EcTermService.deleteTerm(activeTerm._id.toString(), moderator._id.toString());
    console.log("✅ Cleanup completed\n");

    console.log("🎉 All tests completed successfully!");

  } catch (error) {
    console.error("❌ Error during test:", error);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log("\n👋 Disconnected from MongoDB");
  }
}

main();
