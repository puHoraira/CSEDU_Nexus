const { User } = require("../models/User");
const { Member } = require("../models/Member");
const { Role } = require("../models/Role");
const { UserRole } = require("../models/UserRole");
const { Election } = require("../models/Election");
const { Event } = require("../models/Event");
const { Workshop } = require("../models/Workshop");
const { AuditLog } = require("../models/AuditLog");
const { CertificateRequest } = require("../models/CertificateRequest");

class AdminDashboardService {
  /**
   * Get comprehensive dashboard statistics
   */
  static async getDashboardStats() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Run all queries in parallel
    const [
      totalUsers,
      totalMembers,
      activeMembers,
      newUsersThisMonth,
      membersByYear,
      membersByBatch,
      totalRoles,
      roleAssignments,
      upcomingElections,
      upcomingEvents,
      upcomingWorkshops,
      pendingCertificates,
      recentAuditLogs,
      membershipStatusBreakdown,
      ecMembersCount,
    ] = await Promise.all([
      // User stats
      User.countDocuments(),
      Member.countDocuments(),
      Member.countDocuments({ "membershipStatus.status": "Active" }),
      User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),

      // Member distribution by academic year
      Member.aggregate([
        { $group: { _id: "$academicYearLevel", count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),

      // Member distribution by batch
      Member.aggregate([
        { $group: { _id: "$batch", count: { $sum: 1 } } },
        { $sort: { _id: -1 } },
        { $limit: 10 },
      ]),

      // Role stats
      Role.countDocuments(),
      UserRole.countDocuments({
        startsAt: { $lte: now },
        $or: [{ endsAt: null }, { endsAt: { $gt: now } }],
      }),

      // Upcoming activities
      Election.countDocuments({
        nominationStartDate: { $gte: now },
        status: { $in: ["Draft", "Published"] },
      }),
      Event.countDocuments({
        eventDate: { $gte: now },
      }),
      Workshop.countDocuments({
        startDate: { $gte: now },
      }),

      // Pending items
      CertificateRequest.countDocuments({
        status: { $in: ["PendingModerator", "PendingChairman"] },
      }),

      // Recent audit logs
      AuditLog.find({})
        .sort({ timestamp: -1 })
        .limit(10)
        .populate("actorId", "firstName lastName email")
        .select("action resource timestamp actorId metadata"),

      // Membership status breakdown
      Member.aggregate([
        { $group: { _id: "$membershipStatus.status", count: { $sum: 1 } } },
      ]),

      // EC members count
      Member.countDocuments({
        "ecExperience.isCurrent": true,
      }),
    ]);

    return {
      overview: {
        totalUsers,
        totalMembers,
        activeMembers,
        inactiveMembers: totalMembers - activeMembers,
        newUsersThisMonth,
        ecMembersCount,
      },
      memberDistribution: {
        byAcademicYear: membersByYear.map((item) => ({
          year: item._id,
          count: item.count,
        })),
        byBatch: membersByBatch.map((item) => ({
          batch: item._id,
          count: item.count,
        })),
        byStatus: membershipStatusBreakdown.map((item) => ({
          status: item._id,
          count: item.count,
        })),
      },
      roles: {
        totalRoles,
        activeAssignments: roleAssignments,
      },
      upcoming: {
        elections: upcomingElections,
        events: upcomingEvents,
        workshops: upcomingWorkshops,
      },
      pending: {
        certificates: pendingCertificates,
      },
      recentActivity: recentAuditLogs.map((log) => ({
        id: log._id,
        action: log.action,
        resource: log.resource,
        timestamp: log.timestamp,
        actor: log.actorId
          ? {
              name: `${log.actorId.firstName} ${log.actorId.lastName}`,
              email: log.actorId.email,
            }
          : null,
        metadata: log.metadata,
      })),
    };
  }

  /**
   * Get system health metrics
   */
  static async getSystemHealth() {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      usersCreatedToday,
      usersCreatedThisWeek,
      auditLogsToday,
      auditLogsThisWeek,
      failedLogins,
    ] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: oneDayAgo } }),
      User.countDocuments({ createdAt: { $gte: oneWeekAgo } }),
      AuditLog.countDocuments({ timestamp: { $gte: oneDayAgo } }),
      AuditLog.countDocuments({ timestamp: { $gte: oneWeekAgo } }),
      AuditLog.countDocuments({
        action: "LOGIN_FAILED",
        timestamp: { $gte: oneDayAgo },
      }),
    ]);

    return {
      activity: {
        usersCreatedToday,
        usersCreatedThisWeek,
        auditLogsToday,
        auditLogsThisWeek,
      },
      security: {
        failedLoginsToday: failedLogins,
      },
      status: "healthy", // Can be expanded with more checks
    };
  }

  /**
   * Get quick stats for cards
   */
  static async getQuickStats() {
    const [members, users, activeElections, pendingCerts] = await Promise.all([
      Member.countDocuments({ "membershipStatus.status": "Active" }),
      User.countDocuments({ isActive: true }),
      Election.countDocuments({ status: "Published" }),
      CertificateRequest.countDocuments({ status: "PendingModerator" }),
    ]);

    return {
      activeMembers: members,
      activeUsers: users,
      activeElections,
      pendingCertificates: pendingCerts,
    };
  }

  /**
   * Search users with filters
   */
  static async searchUsers(query) {
    const {
      search = "",
      role = "",
      status = "",
      academicYear = "",
      batch = "",
      page = 1,
      limit = 20,
    } = query;

    // Build search query
    const searchQuery = {};
    
    if (search) {
      searchQuery.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    if (status) {
      searchQuery.isActive = status === "active";
    }

    // Get users
    const users = await User.find(searchQuery)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select("firstName lastName email isActive createdAt");

    const total = await User.countDocuments(searchQuery);
    const userIds = users.map((u) => u._id);

    // Get member info
    const memberQuery = { userId: { $in: userIds } };
    if (academicYear) memberQuery.academicYearLevel = academicYear;
    if (batch) memberQuery.batch = parseInt(batch);

    const [members, roleAssignments] = await Promise.all([
      Member.find(memberQuery).select(
        "userId studentId batch academicYearLevel membershipStatus"
      ),
      UserRole.find({
        userId: { $in: userIds },
        startsAt: { $lte: new Date() },
        $or: [{ endsAt: null }, { endsAt: { $gt: new Date() } }],
      }).populate("roleId", "name"),
    ]);

    const memberByUserId = new Map(
      members.map((m) => [m.userId.toString(), m])
    );
    const rolesByUserId = new Map();

    roleAssignments.forEach((assignment) => {
      const key = assignment.userId.toString();
      const current = rolesByUserId.get(key) || [];
      if (assignment.roleId?.name) {
        current.push(assignment.roleId.name);
      }
      rolesByUserId.set(key, current);
    });

    // Filter by role if specified
    let results = users.map((user) => {
      const member = memberByUserId.get(user._id.toString());
      const roles = [...new Set(rolesByUserId.get(user._id.toString()) || [])];

      return {
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        isActive: user.isActive,
        createdAt: user.createdAt,
        studentId: member?.studentId || null,
        batch: member?.batch || null,
        academicYear: member?.academicYearLevel || null,
        membershipStatus: member?.membershipStatus?.status || null,
        roles,
      };
    });

    if (role) {
      results = results.filter((u) => u.roles.includes(role));
    }

    return {
      users: results,
      pagination: {
        page,
        limit,
        total: role ? results.length : total,
        pages: Math.ceil((role ? results.length : total) / limit),
      },
    };
  }

  /**
   * Get user details by ID
   */
  static async getUserDetails(userId) {
    const user = await User.findById(userId).select("-password");
    if (!user) {
      throw new Error("User not found");
    }

    const [member, roleAssignments, auditLogs] = await Promise.all([
      Member.findOne({ userId }).lean(),
      UserRole.find({ userId })
        .populate("roleId", "name scope")
        .sort({ startsAt: -1 }),
      AuditLog.find({ actorId: userId })
        .sort({ timestamp: -1 })
        .limit(20)
        .select("action resource timestamp metadata"),
    ]);

    const now = new Date();
    const activeRoles = roleAssignments.filter(
      (r) =>
        r.startsAt <= now && (!r.endsAt || r.endsAt > now) && r.roleId?.name
    );
    const pastRoles = roleAssignments.filter(
      (r) => r.endsAt && r.endsAt <= now && r.roleId?.name
    );

    return {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      },
      member: member
        ? {
            studentId: member.studentId,
            batch: member.batch,
            session: member.session,
            academicYearLevel: member.academicYearLevel,
            currentYear: member.currentYear,
            membershipStatus: member.membershipStatus,
            academicRecord: member.academicRecord,
            attendanceRecord: member.attendanceRecord,
            ecExperience: member.ecExperience,
            clubParticipation: member.clubParticipation,
          }
        : null,
      roles: {
        active: activeRoles.map((r) => ({
          name: r.roleId.name,
          scope: r.roleId.scope,
          assignedAt: r.startsAt,
        })),
        past: pastRoles.map((r) => ({
          name: r.roleId.name,
          scope: r.roleId.scope,
          assignedAt: r.startsAt,
          revokedAt: r.endsAt,
        })),
      },
      recentActivity: auditLogs.map((log) => ({
        action: log.action,
        resource: log.resource,
        timestamp: log.timestamp,
        metadata: log.metadata,
      })),
    };
  }
}

module.exports = { AdminDashboardService };
