const { ApiError } = require("../core/ApiError");
const { User } = require("../models/User");
const { Member } = require("../models/Member");
const { Role } = require("../models/Role");
const { UserRole } = require("../models/UserRole");
const { AuditService } = require("./AuditService");

class AdminService {
  static async listRoles() {
    return Role.find({}).sort({ name: 1 }).select("name scope");
  }

  static async listUsersWithRoles() {
    const now = new Date();
    const users = await User.find({}).sort({ createdAt: -1 }).select("firstName lastName email isActive");
    const userIds = users.map((item) => item._id);

    const [members, assignments] = await Promise.all([
      Member.find({ userId: { $in: userIds } }).select("userId studentId batch currentYear status"),
      UserRole.find({
        userId: { $in: userIds },
        startsAt: { $lte: now },
        $or: [{ endsAt: null }, { endsAt: { $gt: now } }],
      }).populate("roleId", "name"),
    ]);

    const memberByUserId = new Map(members.map((item) => [item.userId.toString(), item]));
    const rolesByUserId = new Map();

    assignments.forEach((item) => {
      const key = item.userId.toString();
      const current = rolesByUserId.get(key) || [];
      if (item.roleId?.name) {
        current.push(item.roleId.name);
      }
      rolesByUserId.set(key, current);
    });

    return users.map((user) => {
      const member = memberByUserId.get(user._id.toString());
      const roles = [...new Set(rolesByUserId.get(user._id.toString()) || [])].sort();
      return {
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        isActive: user.isActive,
        studentId: member?.studentId || null,
        batch: member?.batch || null,
        currentYear: member?.currentYear || null,
        memberStatus: member?.status || null,
        roles,
      };
    });
  }

  static async assignRole(userId, roleName, actorId, requestId) {
    const [user, role] = await Promise.all([
      User.findById(userId).select("_id"),
      Role.findOne({ name: roleName }).select("_id name"),
    ]);

    if (!user) throw new ApiError(404, "User not found");
    if (!role) throw new ApiError(404, "Role not found");

    const now = new Date();
    const existing = await UserRole.findOne({
      userId,
      roleId: role._id,
      startsAt: { $lte: now },
      $or: [{ endsAt: null }, { endsAt: { $gt: now } }],
    });

    if (!existing) {
      await UserRole.create({ userId, roleId: role._id });
    }

    await AuditService.log({
      actorId,
      action: "ADMIN_ROLE_ASSIGNED",
      resource: "UserRole",
      resourceId: userId,
      requestId,
      metadata: { roleName: role.name },
    });

    return { userId, roleName: role.name, assigned: true };
  }

  static async revokeRole(userId, roleName, actorId, requestId) {
    const role = await Role.findOne({ name: roleName }).select("_id name");
    if (!role) throw new ApiError(404, "Role not found");

    const assignment = await UserRole.findOne({ userId, roleId: role._id, endsAt: null }).sort({ startsAt: -1 });
    if (!assignment) throw new ApiError(404, "Active role assignment not found");

    assignment.endsAt = new Date();
    await assignment.save();

    await AuditService.log({
      actorId,
      action: "ADMIN_ROLE_REVOKED",
      resource: "UserRole",
      resourceId: userId,
      requestId,
      metadata: { roleName: role.name },
    });

    return { userId, roleName: role.name, revoked: true };
  }
}

module.exports = { AdminService };
