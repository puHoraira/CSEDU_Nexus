require("dotenv").config();
const { connectDB } = require("../config/db");
const { User } = require("../models/User");
const { AccessService } = require("../services/AccessService");

async function checkUserRoles(email) {
  await connectDB();
  
  const user = await User.findOne({ email }).select("_id firstName lastName email");
  
  if (!user) {
    console.log(`User with email ${email} not found`);
    process.exit(1);
  }
  
  console.log("\n=== USER INFO ===");
  console.log(`Name: ${user.firstName} ${user.lastName}`);
  console.log(`Email: ${user.email}`);
  console.log(`ID: ${user._id}`);
  
  console.log("\n=== USER ROLES (from UserRole) ===");
  const roleNames = await AccessService.getUserRoleNames(user._id);
  console.log(roleNames);
  
  console.log("\n=== EC POST NAMES (from EcAppointment) ===");
  const postNames = await AccessService.getEcPostNames(user._id, null);
  console.log(postNames);
  
  console.log("\n=== ALL ROLE-LIKE NAMES (combined) ===");
  const allRoles = [...new Set([...roleNames, ...postNames])];
  console.log(allRoles);
  
  console.log("\n=== AUTHORIZATION CHECKS ===");
  console.log("Has ['Moderator', 'Chief Patron']:", allRoles.some(r => ['Moderator', 'Chief Patron'].includes(r)));
  console.log("Has 'Moderator':", allRoles.includes('Moderator'));
  console.log("Has 'Chief Patron':", allRoles.includes('Chief Patron'));
  
  process.exit(0);
}

const email = process.argv[2];
if (!email) {
  console.log("Usage: node checkUserRoles.js <email>");
  process.exit(1);
}

checkUserRoles(email).catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
