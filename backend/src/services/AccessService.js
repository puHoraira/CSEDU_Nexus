const { UserRole } = require("../models/UserRole");
const { Role } = require("../models/Role");
const { RolePermission } = require("../models/RolePermission");
const { Permission } = require("../models/Permission");
const { EcAppointment } = require("../models/EcAppointment");
const { EcPost } = require("../models/EcPost");

class AccessService {
  static normalizePostTitleToRoleName(title) {
    if (!title) return null;
    if (title.startsWith("Executive Member")) return "Executive Member";
    return title;
  }

  static async getUserRoleNames(userId) {
    const now = new Date();

    const assignments = await UserRole.find({
      userId,
      $or: [{ endsAt: null }, { endsAt: { $gt: now } }],
      startsAt: { $lte: now },
    }).populate("roleId");

    return assignments.map((item) => item.roleId?.name).filter(Boolean);
  }

  static async getEcPostNames(userId, activeTermId = null) {
    const query = { endsOn: null };
    if (activeTermId) query.termId = activeTermId;

    const appointments = await EcAppointment.find(query)
      .populate("memberId")
      .populate("postId");

    const userAppointments = appointments.filter(
      (a) => a.memberId?.userId?.toString() === userId.toString()
    );

    return userAppointments
      .map((a) => this.normalizePostTitleToRoleName(a.postId?.title))
      .filter(Boolean);
  }

  static async hasPermission(userId, permissionKey, activeTermId = null) {
    const roleNames = await this.getUserRoleNames(userId);
    const postNames = await this.getEcPostNames(userId, activeTermId);
    const allRoleLikeNames = [...new Set([...roleNames, ...postNames])];

    if (allRoleLikeNames.length === 0) return false;

    const roles = await Role.find({ name: { $in: allRoleLikeNames } });
    if (roles.length === 0) return false;

    const roleIds = roles.map((role) => role._id);
    const permission = await Permission.findOne({ key: permissionKey });
    if (!permission) return false;

    const link = await RolePermission.findOne({ roleId: { $in: roleIds }, permissionId: permission._id });
    return Boolean(link);
  }
}

module.exports = { AccessService };
