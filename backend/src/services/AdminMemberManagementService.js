const { Member } = require("../models/Member");
const { User } = require("../models/User");
const { ApiError } = require("../core/ApiError");

class AdminMemberManagementService {
  /**
   * Get all members with pagination, search, and filters
   */
  static async getAllMembers(options = {}) {
    const {
      page = 1,
      limit = 50,
      search = '',
      yearLevel = '',
      membershipStatus = '',
      batch = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      includeAlumni = true
    } = options;

    // Build query
    const query = {};

    // Search by name, email, or student ID
    if (search) {
      query.$or = [
        { studentId: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by year level
    if (yearLevel) {
      query.academicYearLevel = yearLevel;
    }

    // Filter by membership status
    if (membershipStatus) {
      query['membershipStatus.status'] = membershipStatus;
    }

    // Filter by batch
    if (batch) {
      query.batch = parseInt(batch);
    }

    // Exclude or include alumni
    if (!includeAlumni) {
      query['membershipStatus.status'] = { $ne: 'Graduated' };
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute query
    const [members, totalCount] = await Promise.all([
      Member.find(query)
        .populate('userId', 'fullName email phone avatarUrl profileCompleteness')
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Member.countDocuments(query)
    ]);

    return {
      members: members.map(m => ({
        ...m,
        fullName: m.userId?.fullName,
        email: m.userId?.email,
        phone: m.userId?.phone,
        avatarUrl: m.userId?.avatarUrl
      })),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNextPage: page * limit < totalCount,
        hasPrevPage: page > 1
      }
    };
  }

  /**
   * Get detailed member information
   */
  static async getMemberDetails(memberId) {
    const member = await Member.findById(memberId)
      .populate('userId', 'fullName email phone avatarUrl profileCompleteness createdAt lastLogin')
      .populate('ecExperience.postId', 'postName')
      .populate('ecExperience.termId', 'termName startDate endDate')
      .populate({
        path: 'electionHistory.electionId',
        select: 'name status phase1 phase2'
      })
      .lean();

    if (!member) {
      throw new ApiError(404, 'Member not found');
    }

    // Calculate scores
    const memberDoc = await Member.findById(memberId);
    const leadershipScore = memberDoc.calculateLeadershipScore();
    const alumniProfileCompleteness = memberDoc.calculateAlumniProfileCompleteness();

    return {
      ...member,
      leadershipScore,
      alumniProfileCompleteness,
      user: member.userId
    };
  }

  /**
   * Search members by name or email
   */
  static async searchMembers(searchTerm, limit = 20) {
    // First, search users by name or email
    const users = await User.find({
      $or: [
        { fullName: { $regex: searchTerm, $options: 'i' } },
        { email: { $regex: searchTerm, $options: 'i' } }
      ]
    })
      .select('_id fullName email')
      .limit(limit)
      .lean();

    const userIds = users.map(u => u._id);

    // Then get members for those users
    const members = await Member.find({
      $or: [
        { userId: { $in: userIds } },
        { studentId: { $regex: searchTerm, $options: 'i' } }
      ]
    })
      .populate('userId', 'fullName email avatarUrl')
      .select('studentId batch currentYear academicYearLevel membershipStatus userId')
      .limit(limit)
      .lean();

    return members.map(m => ({
      memberId: m._id,
      studentId: m.studentId,
      fullName: m.userId?.fullName,
      email: m.userId?.email,
      avatarUrl: m.userId?.avatarUrl,
      batch: m.batch,
      currentYear: m.currentYear,
      academicYearLevel: m.academicYearLevel,
      membershipStatus: m.membershipStatus?.status
    }));
  }

  /**
   * Get alumni members with filters
   */
  static async getAlumniMembers(options = {}) {
    const {
      page = 1,
      limit = 50,
      graduatedYear = '',
      employmentStatus = '',
      industry = '',
      willingToMentor = null,
      sortBy = 'alumniInfo.graduatedYear',
      sortOrder = 'desc'
    } = options;

    // Build query for alumni
    const query = {
      'membershipStatus.status': 'Graduated'
    };

    if (graduatedYear) {
      query['alumniInfo.graduatedYear'] = parseInt(graduatedYear);
    }

    if (employmentStatus) {
      query['alumniInfo.employmentStatus'] = employmentStatus;
    }

    if (industry) {
      query['alumniInfo.industry'] = { $regex: industry, $options: 'i' };
    }

    if (willingToMentor !== null) {
      query['alumniInfo.willingToMentor'] = willingToMentor === 'true';
    }

    const skip = (page - 1) * limit;

    const [alumni, totalCount] = await Promise.all([
      Member.find(query)
        .populate('userId', 'fullName email phone avatarUrl')
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Member.countDocuments(query)
    ]);

    return {
      alumni: alumni.map(a => ({
        memberId: a._id,
        studentId: a.studentId,
        fullName: a.userId?.fullName,
        email: a.userId?.email,
        phone: a.userId?.phone,
        avatarUrl: a.userId?.avatarUrl,
        batch: a.batch,
        graduatedYear: a.alumniInfo?.graduatedYear,
        currentEmployer: a.alumniInfo?.currentEmployer,
        currentPosition: a.alumniInfo?.currentPosition,
        employmentStatus: a.alumniInfo?.employmentStatus,
        industry: a.alumniInfo?.industry,
        linkedinUrl: a.alumniInfo?.linkedinUrl,
        willingToMentor: a.alumniInfo?.willingToMentor,
        willingToRecruit: a.alumniInfo?.willingToRecruit,
        profileCompleteness: a.alumniInfo?.profileCompleteness || 0
      })),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNextPage: page * limit < totalCount,
        hasPrevPage: page > 1
      }
    };
  }

  /**
   * Get member statistics
   */
  static async getMemberStatistics() {
    const [
      totalMembers,
      activeMembers,
      alumniCount,
      retainedStudents,
      yearWiseDistribution,
      alumniEmploymentStats,
      topPerformers,
      recentJoins
    ] = await Promise.all([
      // Total members
      Member.countDocuments(),

      // Active members
      Member.countDocuments({ 'membershipStatus.status': 'Active' }),

      // Alumni count
      Member.countDocuments({ 'membershipStatus.status': 'Graduated' }),

      // Retained students
      Member.countDocuments({ 'retentionStatus.isRetained': true }),

      // Year-wise distribution
      Member.aggregate([
        {
          $match: {
            'membershipStatus.status': { $in: ['Active', 'Inactive'] }
          }
        },
        {
          $group: {
            _id: '$academicYearLevel',
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // Alumni employment stats
      Member.aggregate([
        {
          $match: {
            'membershipStatus.status': 'Graduated',
            'alumniInfo.employmentStatus': { $exists: true }
          }
        },
        {
          $group: {
            _id: '$alumniInfo.employmentStatus',
            count: { $sum: 1 }
          }
        }
      ]),

      // Top performers (by CGPA)
      Member.find({ 'membershipStatus.status': 'Active' })
        .populate('userId', 'fullName')
        .sort({ 'academicRecord.currentCgpa': -1 })
        .limit(10)
        .select('studentId userId academicRecord.currentCgpa academicYearLevel batch')
        .lean(),

      // Recent joins (last 30 days)
      Member.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      })
    ]);

    return {
      overview: {
        totalMembers,
        activeMembers,
        alumniCount,
        retainedStudents,
        recentJoins
      },
      yearWiseDistribution: yearWiseDistribution.map(d => ({
        yearLevel: d._id,
        count: d.count
      })),
      alumniEmploymentStats: alumniEmploymentStats.map(d => ({
        status: d._id,
        count: d.count
      })),
      topPerformers: topPerformers.map(m => ({
        studentId: m.studentId,
        fullName: m.userId?.fullName,
        cgpa: m.academicRecord?.currentCgpa,
        yearLevel: m.academicYearLevel,
        batch: m.batch
      }))
    };
  }

  /**
   * Update member information
   */
  static async updateMemberInfo(memberId, updates, updatedBy) {
    const member = await Member.findById(memberId);

    if (!member) {
      throw new ApiError(404, 'Member not found');
    }

    // Update allowed fields
    const allowedFields = [
      'batch',
      'currentYear',
      'academicYearLevel',
      'session',
      'academicRecord',
      'attendanceRecord',
      'membershipStatus',
      'alumniInfo'
    ];

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        if (key === 'alumniInfo' && typeof updates[key] === 'object') {
          // Merge alumni info
          member.alumniInfo = { ...member.alumniInfo, ...updates[key] };
          member.alumniInfo.lastUpdated = new Date();
          member.alumniInfo.profileCompleteness = member.calculateAlumniProfileCompleteness();
        } else {
          member[key] = updates[key];
        }
      }
    });

    await member.save();

    return member;
  }

  /**
   * Get members by IDs (for notifications)
   */
  static async getMembersByIds(memberIds) {
    const members = await Member.find({ _id: { $in: memberIds } })
      .populate('userId', 'fullName email')
      .select('studentId userId academicYearLevel batch membershipStatus')
      .lean();

    return members;
  }

  /**
   * Get members by year level (for year-wise notifications)
   */
  static async getMembersByYearLevel(yearLevels) {
    const members = await Member.find({
      academicYearLevel: { $in: yearLevels },
      'membershipStatus.status': { $in: ['Active', 'Inactive'] }
    })
      .populate('userId', 'fullName email')
      .select('studentId userId academicYearLevel batch')
      .lean();

    return members;
  }

  /**
   * Export members data (CSV format)
   */
  static async exportMembersData(filters = {}) {
    const query = {};

    if (filters.yearLevel) {
      query.academicYearLevel = filters.yearLevel;
    }

    if (filters.membershipStatus) {
      query['membershipStatus.status'] = filters.membershipStatus;
    }

    const members = await Member.find(query)
      .populate('userId', 'fullName email phone')
      .lean();

    return members.map(m => ({
      studentId: m.studentId,
      fullName: m.userId?.fullName,
      email: m.userId?.email,
      phone: m.userId?.phone,
      batch: m.batch,
      currentYear: m.currentYear,
      academicYearLevel: m.academicYearLevel,
      cgpa: m.academicRecord?.currentCgpa,
      attendance: m.academicRecord?.overallAttendancePercentage,
      membershipStatus: m.membershipStatus?.status,
      joinDate: m.membershipStatus?.joinDate
    }));
  }
}

module.exports = { AdminMemberManagementService };
