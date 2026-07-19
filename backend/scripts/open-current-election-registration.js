/**
 * Simple script to open Phase 1 registration for the CURRENT active election
 * Run this whenever you create a new election
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const { Election } = require("../src/models/Election");

async function openCurrentElectionRegistration() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Find the most recent election
    const election = await Election.findOne().sort({ createdAt: -1 });
    
    if (!election) {
      console.log("❌ No election found!");
      return;
    }

    console.log(`📋 Opening registration for: ${election.name}`);
    console.log(`   Election ID: ${election._id}`);
    console.log(`   Current Status: ${election.status}`);
    console.log(`   Phase 1 Status: ${election.phase1?.status || "Not set"}\n`);

    // Open Phase 1 registration
    election.status = "Phase1_Active";
    election.currentPhase = 1;
    election.phase1.status = "Registration_Open";
    election.phase1.candidateRegistrationStart = new Date();
    election.phase1.candidateRegistrationEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    await election.save();

    console.log("✅ Phase 1 registration is NOW OPEN!");
    console.log(`   Registration ends: ${election.phase1.candidateRegistrationEnd}`);
    console.log(`\n🎉 Candidates can now register!`);

  } catch (error) {
    console.error("\n❌ Error:", error.message);
  } finally {
    await mongoose.disconnect();
  }
}

openCurrentElectionRegistration();
