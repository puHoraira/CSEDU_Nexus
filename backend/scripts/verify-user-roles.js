#!/usr/bin/env node
const mongoose = require("mongoose");
const { User } = require("../src/models/User");
const { Role } = require("../src/models/Role");
const { UserRole } = require("../src/models/UserRole");
const { connectDB } = require("../src/config/db");

async function verifyUserRoles() {
  try {
    await connectDB();
    console.log("\nConnected to database\n");

    // Find the user
    const userEmail = "abuhoraira10152@gmail.com";
    const user = await User.findOne({ email: userEmail });
    
    if (!user) {
      console.log(`❌ User not found: ${userEmail}`);
      process.exit(1);
    }

    console.log("=== USER INFORMATION ===\n");
    console.log(`ID: ${user._id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Name: ${user.fullName}`);
    console.log(`Is Active: ${user.isActive}`);
    console.log(`Email Verified: ${user.emailVerified}`);

    // Get user roles from UserRole table
    const userRoles = await UserRole.find({ userId: user._id })
      .populate("roleId")
      .lean();

    console.log("\n=== ROLES IN DATABASE ===\n");
    if (userRoles.length === 0) {
      console.log("❌ No roles found in database");
    } else {
      userRoles.forEach((ur, index) => {
        console.log(`${index + 1}. ${ur.roleId.name}`);
        console.log(`   Role ID: ${ur.roleId._id}`);
        console.log(`   Assigned At: ${ur.createdAt}`);
      });
    }

    console.log("\n=== VERIFICATION SUMMARY ===\n");
    console.log(`✓ User exists in database`);
    console.log(`✓ User has ${userRoles.length} role(s) assigned`);
    console.log(`\n⚠️  IMPORTANT: User must LOG OUT and LOG BACK IN to get new JWT token with these roles!\n`);
    console.log(`Current JWT tokens were created before roles were added.`);
    console.log(`After re-login, the JWT token will contain the updated roles.\n`);

    await mongoose.disconnect();
    console.log("Disconnected from database\n");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

verifyUserRoles();
