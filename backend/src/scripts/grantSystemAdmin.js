require("dotenv").config();
const { connectDB } = require("../config/db");
const { User } = require("../models/User");
const { Role } = require("../models/Role");
const { UserRole } = require("../models/UserRole");

async function run() {
  const email = (process.argv[2] || "").toLowerCase().trim();
  if (!email) {
    console.error("Usage: npm run grant-admin -- <user-email>");
    process.exit(1);
  }

  await connectDB();

  const user = await User.findOne({ email });
  if (!user) {
    console.error("User not found for email:", email);
    process.exit(1);
  }

  let role = await Role.findOne({ name: "System Admin" });
  if (!role) {
    role = await Role.create({ name: "System Admin", scope: "system" });
  }

  const existing = await UserRole.findOne({ userId: user._id, roleId: role._id, endsAt: null });
  if (!existing) {
    await UserRole.create({ userId: user._id, roleId: role._id });
  }

  console.log("System Admin granted for:", email);
  process.exit(0);
}

run().catch((error) => {
  console.error("Grant admin failed", error);
  process.exit(1);
});
