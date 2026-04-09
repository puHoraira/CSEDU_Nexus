const { Member } = require("../models/Member");

async function canRegisterMember({ studentId }) {
  const existing = await Member.findOne({ studentId });
  if (existing) {
    return { allowed: false, reason: "Student ID already registered" };
  }
  return { allowed: true };
}

module.exports = { canRegisterMember };
