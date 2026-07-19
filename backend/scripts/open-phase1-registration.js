require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const { Election } = require("../src/models/Election");

console.log("MongoDB URI:", process.env.MONGODB_URI ? "✅ Found" : "❌ Not found");

async function openPhase1Registration() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Find the election (get the most recent one)
    const election = await Election.findOne()
      .sort({ createdAt: -1 });

    if (!election) {
      console.log("❌ No election found");
      return;
    }

    console.log(`\n📋 Election: ${election.name}`);
    console.log(`   ID: ${election._id}`);
    console.log(`   Status: ${election.status}`);
    console.log(`   Current Phase: ${election.currentPhase}`);
    console.log(`\n   Phase 1 Status: ${election.phase1?.status || "Not set"}`);
    console.log(`   Phase 2 Status: ${election.phase2?.status || "Not set"}`);

    // Update Phase 1 to open registration
    election.phase1.status = "Registration_Open";
    election.phase1.candidateRegistrationStart = new Date();
    election.phase1.candidateRegistrationEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    election.status = "Phase1_Active";
    election.currentPhase = 1;

    await election.save();

    console.log("\n✅ Phase 1 registration opened!");
    console.log(`   Registration Start: ${election.phase1.candidateRegistrationStart}`);
    console.log(`   Registration End: ${election.phase1.candidateRegistrationEnd}`);
    console.log(`   Election Status: ${election.status}`);
    console.log(`   Phase 1 Status: ${election.phase1.status}`);

    console.log("\n✅ Candidates can now register for Phase 1!");

  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

openPhase1Registration();
