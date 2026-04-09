const mongoose = require("mongoose");

const userRoleSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    roleId: { type: mongoose.Schema.Types.ObjectId, ref: "Role", required: true },
    startsAt: { type: Date, default: Date.now },
    endsAt: { type: Date, default: null },
  },
  { timestamps: true }
);

userRoleSchema.index({ userId: 1, roleId: 1, startsAt: 1 }, { unique: true });

const UserRole = mongoose.model("UserRole", userRoleSchema);

module.exports = { UserRole };
