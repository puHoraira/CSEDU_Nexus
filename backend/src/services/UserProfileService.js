const { User } = require("../models/User");
const { Member } = require("../models/Member");
const { ApiError } = require("../core/ApiError");
const { AccessService } = require("./AccessService");

class UserProfileService {
  /**
   * Get user profile by ID with member information
   */
  static async getUserProfile(userId, requestingUserId) {
    const user = await User.findOne({ _id: userId, isActive: true })
      .select("-passwordHash -emailVerificationToken -passwordResetToken -twoFactorAuth.secret")
      .lean();

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // Get user roles from AccessService
    const roleNames = await AccessService.getUserRoleNames(userId);
    const postNames = await AccessService.getEcPostNames(userId);
    const allRoles = [...new Set([...roleNames, ...postNames])];

    // Get member information if user is a student
    let memberInfo = null;
    const member = await Member.findOne({ userId })
      .populate("ecExperience.termId", "termNumber startDate endDate")
      .populate("ecExperience.postId", "postName category")
      .lean();

    if (member) {
      memberInfo = {
        studentId: member.studentId,
        batch: member.batch,
        currentYear: member.currentYear,
        academicYearLevel: member.academicYearLevel,
        session: member.session,
        academicRecord: member.academicRecord,
        ecExperience: member.ecExperience?.map(exp => ({
          postName: exp.postName,
          startDate: exp.startDate,
          endDate: exp.endDate,
          isCurrent: exp.isCurrent,
          performanceRating: exp.performanceRating,
        })) || [],
        clubParticipation: member.clubParticipation,
      };
    }

    // Apply privacy settings
    const profile = {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.privacySettings?.showEmail ? user.email : null,
      phone: user.privacySettings?.showPhone ? user.phone : null,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      designation: user.designation,
      experience: user.experience,
      roles: allRoles,
      socialMedia: user.privacySettings?.showSocialMedia ? user.socialMedia : null,
      technicalSkills: user.technicalSkills,
      softSkills: user.softSkills,
      achievements: user.achievements,
      certifications: user.certifications,
      workExperience: user.workExperience,
      leadershipExperience: user.leadershipExperience,
      hobbies: user.hobbies,
      interests: user.interests,
      privacySettings: {
        allowDirectMessages: user.privacySettings?.allowDirectMessages ?? true,
        showInDirectory: user.privacySettings?.showInDirectory ?? true,
      },
      member: memberInfo,
      createdAt: user.createdAt,
    };

    return profile;
  }

  /**
   * Search users for directory/mentions
   */
  static async searchUsers(query, options = {}) {
    const { limit = 20, excludeUserId = null, roles = null } = options;

    const searchCriteria = {
      isActive: true,
      "privacySettings.showInDirectory": { $ne: false },
    };

    if (query) {
      searchCriteria.$or = [
        { firstName: { $regex: query, $options: "i" } },
        { lastName: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
      ];
    }

    if (excludeUserId) {
      searchCriteria._id = { $ne: excludeUserId };
    }

    const users = await User.find(searchCriteria)
      .select("firstName lastName email avatarUrl bio designation")
      .limit(limit)
      .lean();

    // Get roles for each user
    const enrichedUsers = await Promise.all(
      users.map(async (user) => {
        const roleNames = await AccessService.getUserRoleNames(user._id);
        const postNames = await AccessService.getEcPostNames(user._id);
        const userRoles = [...new Set([...roleNames, ...postNames])];

        return {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: `${user.firstName} ${user.lastName}`,
          email: user.email,
          avatarUrl: user.avatarUrl,
          bio: user.bio,
          designation: user.designation,
          roles: userRoles,
        };
      })
    );

    // Filter by roles if specified
    if (roles && roles.length > 0) {
      return enrichedUsers.filter(user =>
        user.roles.some(role => roles.includes(role))
      );
    }

    return enrichedUsers;
  }

  /**
   * Get user directory (all visible users)
   */
  static async getUserDirectory(requestingUserId, { page = 1, limit = 50, filter = {} } = {}) {
    const skip = (page - 1) * limit;

    const criteria = {
      isActive: true,
      "privacySettings.showInDirectory": { $ne: false },
      _id: { $ne: requestingUserId }, // Exclude self
    };

    // Apply filters
    if (filter.batch) {
      // Find members with specific batch
      const members = await Member.find({ batch: filter.batch }).select("userId");
      const userIds = members.map(m => m.userId);
      criteria._id = { $in: userIds, $ne: requestingUserId };
    }

    if (filter.year) {
      const members = await Member.find({ academicYearLevel: filter.year }).select("userId");
      const userIds = members.map(m => m.userId);
      criteria._id = { $in: userIds, $ne: requestingUserId };
    }

    const users = await User.find(criteria)
      .select("firstName lastName email avatarUrl bio designation")
      .sort({ firstName: 1, lastName: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await User.countDocuments(criteria);

    // Get member info for each user
    const userIds = users.map(u => u._id);
    const members = await Member.find({ userId: { $in: userIds } })
      .select("userId studentId batch currentYear academicYearLevel")
      .lean();

    const memberMap = new Map();
    members.forEach(m => {
      memberMap.set(m.userId.toString(), m);
    });

    // Get roles for each user and enrich data
    const enrichedUsers = await Promise.all(
      users.map(async (user) => {
        const roleNames = await AccessService.getUserRoleNames(user._id);
        const postNames = await AccessService.getEcPostNames(user._id);
        const userRoles = [...new Set([...roleNames, ...postNames])];

        const member = memberMap.get(user._id.toString());
        return {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: `${user.firstName} ${user.lastName}`,
          email: user.email,
          avatarUrl: user.avatarUrl,
          bio: user.bio,
          designation: user.designation,
          roles: userRoles,
          member: member ? {
            studentId: member.studentId,
            batch: member.batch,
            currentYear: member.currentYear,
            academicYearLevel: member.academicYearLevel,
          } : null,
        };
      })
    );

    // Filter by roles if specified (after enrichment since roles come from AccessService)
    let finalUsers = enrichedUsers;
    if (filter.roles && filter.roles.length > 0) {
      finalUsers = enrichedUsers.filter(user =>
        user.roles.some(role => filter.roles.includes(role))
      );
    }

    return {
      users: finalUsers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update user's own profile
   */
  static async updateOwnProfile(userId, updateData) {
    const allowedFields = [
      "phone",
      "alternativePhone",
      "bio",
      "personalStatement",
      "avatarUrl",
      "hobbies",
      "interests",
      "technicalSkills",
      "softSkills",
      "programmingLanguages",
      "frameworks",
      "tools",
      "socialMedia",
      "presentAddress",
      "permanentAddress",
      "emergencyContact",
      "workExperience",
      "achievements",
      "certifications",
      "leadershipExperience",
      "volunteerExperience",
      "privacySettings",
    ];

    const updates = {};
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        updates[field] = updateData[field];
      }
    });

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select("-passwordHash -emailVerificationToken -passwordResetToken");

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    return user;
  }
}

module.exports = { UserProfileService };
