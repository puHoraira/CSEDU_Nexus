const { User } = require("../models/User");
const { Member } = require("../models/Member");
const bcrypt = require("bcryptjs");
const { Meeting } = require("../models/Meeting");
const { Election } = require("../models/Election");
const { ElectionCandidate } = require("../models/ElectionCandidate");
const { MembershipCancellation } = require("../models/MembershipCancellation");
const { Transaction } = require("../models/Transaction");
const { AuditLog } = require("../models/AuditLog");
const { Role } = require("../models/Role");
const { Permission } = require("../models/Permission");
const { RolePermission } = require("../models/RolePermission");
const { UserRole } = require("../models/UserRole");
const { AccessService } = require("./AccessService");
const { ApiError } = require("../core/ApiError");
const { AuditService } = require("./AuditService");

class ModeratorService {
  static parseCsv(csvContent) {
    const rows = csvContent
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (rows.length < 2) {
      throw new ApiError(400, "CSV must include header and at least one data row");
    }

    const header = rows[0].split(",").map((item) => item.trim());
    const requiredColumns = [
      "firstName",
      "lastName",
      "email",
      "password",
      "studentId",
      "batch",
      "currentYear",
      "experience",
    ];

    const missing = requiredColumns.filter((column) => !header.includes(column));
    if (missing.length) {
      throw new ApiError(400, `CSV is missing required columns: ${missing.join(", ")}`);
    }

    const index = Object.fromEntries(header.map((name, idx) => [name, idx]));

    return rows.slice(1).map((line, rowIndex) => {
      const parts = line.split(",");
      return {
        rowNumber: rowIndex + 2,
        firstName: (parts[index.firstName] || "").trim(),
        lastName: (parts[index.lastName] || "").trim(),
        email: (parts[index.email] || "").trim().toLowerCase(),
        password: (parts[index.password] || "").trim(),
        studentId: (parts[index.studentId] || "").trim(),
        batch: Number((parts[index.batch] || "").trim()),
        currentYear: Number((parts[index.currentYear] || "").trim()),
        experience: (parts[index.experience] || "").trim(),
      };
    });
  }

  static async bulkRegisterFromCsv(csvContent, actorId, requestId) {
    const records = this.parseCsv(csvContent);
    const generalMemberRole = await Role.findOne({ name: "General Member" });
    if (!generalMemberRole) {
      throw new ApiError(500, "General Member role is missing. Run seed first.");
    }

    const summary = {
      totalRows: records.length,
      created: 0,
      skipped: 0,
      errors: [],
    };

    for (const record of records) {
      try {
        if (!record.firstName || !record.lastName || !record.email || !record.password || !record.studentId) {
          throw new Error("Missing required field values");
        }
        if (record.password.length < 8) {
          throw new Error("Password must be at least 8 characters");
        }
        if (!Number.isInteger(record.batch) || record.batch < 2000 || record.batch > 2100) {
          throw new Error("Batch must be a valid year");
        }
        if (!Number.isInteger(record.currentYear) || record.currentYear < 1 || record.currentYear > 5) {
          throw new Error("Current year must be between 1 and 5");
        }

        const [emailExists, studentExists] = await Promise.all([
          User.findOne({ email: record.email }).select("_id"),
          Member.findOne({ studentId: record.studentId }).select("_id"),
        ]);

        if (emailExists || studentExists) {
          summary.skipped += 1;
          continue;
        }

        const passwordHash = await bcrypt.hash(record.password, 10);
        const user = await User.create({
          email: record.email,
          passwordHash,
          firstName: record.firstName,
          lastName: record.lastName,
          experience: record.experience || "",
          bio: record.experience || "",
        });

        await Member.create({
          userId: user._id,
          studentId: record.studentId,
          batch: record.batch,
          currentYear: record.currentYear,
        });

        await UserRole.create({ userId: user._id, roleId: generalMemberRole._id });
        summary.created += 1;
      } catch (error) {
        summary.errors.push({ rowNumber: record.rowNumber, message: error.message || "Unknown row failure" });
      }
    }

    await AuditService.log({
      actorId,
      action: "MODERATOR_BULK_REGISTER",
      resource: "User",
      requestId,
      metadata: { totalRows: summary.totalRows, created: summary.created, skipped: summary.skipped },
    });

    return summary;
  }

  static async getPermissionsByRoles(roleNames) {
    if (!roleNames.length) return [];

    const roles = await Role.find({ name: { $in: roleNames } }).select("_id");
    const roleIds = roles.map((item) => item._id);
    if (!roleIds.length) return [];

    const links = await RolePermission.find({ roleId: { $in: roleIds } }).select("permissionId");
    const permissionIds = [...new Set(links.map((item) => item.permissionId.toString()))];
    if (!permissionIds.length) return [];

    const permissions = await Permission.find({ _id: { $in: permissionIds } }).select("key -_id");
    return permissions.map((item) => item.key).sort();
  }

  static async getFinancialSummary() {
    const rows = await Transaction.aggregate([
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" },
        },
      },
    ]);

    const totals = rows.reduce(
      (acc, row) => {
        if (row._id === "Income") acc.income += row.total;
        if (row._id === "Expenditure") acc.expenditure += row.total;
        return acc;
      },
      { income: 0, expenditure: 0 }
    );

    return {
      income: totals.income,
      expenditure: totals.expenditure,
      balance: totals.income - totals.expenditure,
    };
  }

  static async getModeratorDetails(userId) {
    const now = new Date();
    const [user, member, roleNames, pendingCancellations, pendingCandidates, activeElections, upcomingMeetings, recentAudit] =
      await Promise.all([
        User.findById(userId).select("firstName lastName email"),
        Member.findOne({ userId }).select("studentId batch currentYear status"),
        AccessService.getUserRoleNames(userId),
        MembershipCancellation.find({
          status: "InReview",
          approvals: { $elemMatch: { role: "Moderator", action: "Pending" } },
        })
          .sort({ createdAt: -1 })
          .limit(8)
          .populate("memberId", "studentId batch currentYear status"),
        ElectionCandidate.find({ status: "Pending" })
          .sort({ createdAt: -1 })
          .limit(8)
          .populate("electionId", "name phase status")
          .populate("memberId", "studentId batch currentYear")
          .populate("postId", "title"),
        Election.countDocuments({ status: "Active" }),
        Meeting.find({ status: "Scheduled", meetingDate: { $gte: now } })
          .sort({ meetingDate: 1 })
          .limit(8)
          .select("title meetingDate venue status"),
        AuditLog.find({ actorId: userId }).sort({ createdAt: -1 }).limit(8).select("action resource createdAt"),
      ]);

    const permissions = await this.getPermissionsByRoles(roleNames);
    const financialSummary = await this.getFinancialSummary();

    return {
      profile: {
        name: user ? `${user.firstName} ${user.lastName}` : "Unknown Moderator",
        email: user?.email || "",
        studentId: member?.studentId || null,
        batch: member?.batch || null,
        currentYear: member?.currentYear || null,
        memberStatus: member?.status || null,
      },
      access: {
        roles: roleNames,
        permissions,
      },
      queues: {
        pendingCancellationCount: pendingCancellations.length,
        pendingCandidateCount: pendingCandidates.length,
        activeElectionCount: activeElections,
        upcomingMeetingCount: upcomingMeetings.length,
      },
      financialSummary,
      pendingCancellations: pendingCancellations.map((row) => ({
        id: row._id,
        reason: row.reason,
        status: row.status,
        createdAt: row.createdAt,
        member: row.memberId,
      })),
      pendingCandidates: pendingCandidates.map((row) => ({
        id: row._id,
        status: row.status,
        election: row.electionId,
        member: row.memberId,
        post: row.postId,
      })),
      upcomingMeetings,
      recentAudit,
    };
  }

  static async listElectionCommissioners() {
    const role = await Role.findOne({ name: "Election Commissioner" });
    if (!role) return [];

    const assignments = await UserRole.find({ roleId: role._id, endsAt: null })
      .populate("userId", "firstName lastName email")
      .sort({ createdAt: -1 });

    return assignments.map((item) => ({
      userId: item.userId?._id,
      name: item.userId ? `${item.userId.firstName} ${item.userId.lastName}` : "Unknown",
      email: item.userId?.email || "",
      assignedAt: item.startsAt,
    }));
  }

  static async assignElectionCommissioner(targetUserId, actorId, requestId) {
    const alumniRole = await Role.findOne({ name: "Alumni" });
    const commissionerRole = await Role.findOne({ name: "Election Commissioner" });
    if (!alumniRole || !commissionerRole) throw new ApiError(500, "Required roles are not seeded");

    const alumniAssignment = await UserRole.findOne({
      userId: targetUserId,
      roleId: alumniRole._id,
      $or: [{ endsAt: null }, { endsAt: { $gt: new Date() } }],
    });
    if (!alumniAssignment) throw new ApiError(400, "Only Alumni are eligible for Election Commissioner");

    const existing = await UserRole.findOne({
      userId: targetUserId,
      roleId: commissionerRole._id,
      $or: [{ endsAt: null }, { endsAt: { $gt: new Date() } }],
    });
    if (!existing) {
      await UserRole.create({ userId: targetUserId, roleId: commissionerRole._id });
    }

    await AuditService.log({
      actorId,
      action: "ELECTION_COMMISSIONER_ASSIGNED",
      resource: "UserRole",
      resourceId: targetUserId,
      requestId,
    });

    return { userId: targetUserId, role: "Election Commissioner" };
  }

  static async revokeElectionCommissioner(targetUserId, actorId, requestId) {
    const commissionerRole = await Role.findOne({ name: "Election Commissioner" });
    if (!commissionerRole) throw new ApiError(500, "Election Commissioner role is not seeded");

    const assignment = await UserRole.findOne({ userId: targetUserId, roleId: commissionerRole._id, endsAt: null });
    if (!assignment) throw new ApiError(404, "Active Election Commissioner assignment not found");

    assignment.endsAt = new Date();
    await assignment.save();

    await AuditService.log({
      actorId,
      action: "ELECTION_COMMISSIONER_REVOKED",
      resource: "UserRole",
      resourceId: targetUserId,
      requestId,
    });

    return { userId: targetUserId, role: "Election Commissioner", revoked: true };
  }
}

module.exports = { ModeratorService };