require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const { Election } = require("../src/models/Election");
const { Member } = require("../src/models/Member");
const { User } = require("../src/models/User");

async function fixElectionCandidateRegistration() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // 1. Check Election Status
    console.log("📋 CHECKING ELECTION STATUS...");
    const election = await Election.findOne().sort({ createdAt: -1 });
    
    if (!election) {
      console.log("❌ No election found!");
      return;
    }

    console.log(`\n   Election: ${election.name}`);
    console.log(`   ID: ${election._id}`);
    console.log(`   Status: ${election.status}`);
    console.log(`   Current Phase: ${election.currentPhase}`);
    console.log(`   Phase 1 Status: ${election.phase1?.status}`);
    console.log(`   Phase 2 Status: ${election.phase2?.status}`);

    // Fix Phase 1 if needed
    if (election.phase1?.status !== "Registration_Open") {
      console.log("\n⚠️  Phase 1 registration is not open. Opening it now...");
      election.phase1.status = "Registration_Open";
      election.phase1.candidateRegistrationStart = new Date();
      election.phase1.candidateRegistrationEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      election.status = "Phase1_Active";
      election.currentPhase = 1;
      await election.save();
      console.log("✅ Phase 1 registration opened!");
    } else {
      console.log("✅ Phase 1 registration is already open");
    }

    // 2. Check Member Status
    console.log("\n\n👥 CHECKING MEMBER STATUS...");
    const members = await Member.find()
      .populate("userId", "firstName lastName email")
      .limit(10)
      .lean();

    console.log(`\nFound ${members.length} members (showing first 10):`);
    
    for (const member of members) {
      const userName = member.userId ? `${member.userId.firstName} ${member.userId.lastName}` : "Unknown";
      const status = member.membershipStatus?.status || "No status";
      const statusColor = status === "Active" ? "✅" : "❌";
      
      console.log(`\n   ${statusColor} ${userName}`);
      console.log(`      Member ID: ${member._id}`);
      console.log(`      Student ID: ${member.studentId}`);
      console.log(`      Batch: ${member.batch}`);
      console.log(`      Membership Status: ${status}`);
      console.log(`      Full Status Object:`, JSON.stringify(member.membershipStatus, null, 2));
    }

    // 3. Fix members with incorrect status
    console.log("\n\n🔧 FIXING MEMBER STATUSES...");
    
    const membersWithoutActiveStatus = await Member.find({
      $or: [
        { "membershipStatus.status": { $ne: "Active" } },
        { membershipStatus: { $exists: false } },
        { "membershipStatus.status": null }
      ]
    });

    console.log(`\nFound ${membersWithoutActiveStatus.length} members with non-Active status`);

    if (membersWithoutActiveStatus.length > 0) {
      for (const member of membersWithoutActiveStatus) {
        // Set default active membership status
        if (!member.membershipStatus) {
          member.membershipStatus = {};
        }
        member.membershipStatus.status = "Active";
        member.membershipStatus.memberSince = member.membershipStatus.memberSince || member.createdAt || new Date();
        member.membershipStatus.lastRenewal = member.membershipStatus.lastRenewal || new Date();
        member.membershipStatus.expiryDate = member.membershipStatus.expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
        
        await member.save();
        console.log(`   ✅ Fixed: ${member.studentId} - Set to Active`);
      }
      console.log(`\n✅ Updated ${membersWithoutActiveStatus.length} members to Active status`);
    } else {
      console.log("✅ All members already have Active status");
    }

    // 4. Summary
    console.log("\n\n" + "=".repeat(60));
    console.log("📊 FINAL STATUS SUMMARY");
    console.log("=".repeat(60));
    
    const finalElection = await Election.findById(election._id);
    console.log("\n📋 Election:");
    console.log(`   Status: ${finalElection.status}`);
    console.log(`   Phase 1: ${finalElection.phase1?.status}`);
    console.log(`   Registration End: ${finalElection.phase1?.candidateRegistrationEnd}`);
    
    const activeMembers = await Member.countDocuments({ "membershipStatus.status": "Active" });
    const totalMembers = await Member.countDocuments();
    
    console.log("\n👥 Members:");
    console.log(`   Total Members: ${totalMembers}`);
    console.log(`   Active Members: ${activeMembers}`);
    console.log(`   Inactive Members: ${totalMembers - activeMembers}`);
    
    console.log("\n✅ Everything is now configured correctly!");
    console.log("   You can now register candidates for the election.");
    console.log("=".repeat(60) + "\n");

  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB\n");
  }
}

fixElectionCandidateRegistration();
