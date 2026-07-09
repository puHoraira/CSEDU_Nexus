const { ApiError } = require("../core/ApiError");
const { User } = require("../models/User");
const { Member } = require("../models/Member");
const { Teacher } = require("../models/Teacher");
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

    const [members, teachers, assignments] = await Promise.all([
      Member.find({ userId: { $in: userIds } }).select("userId studentId batch currentYear academicYearLevel membershipStatus"),
      Teacher.find({ userId: { $in: userIds } }).select("userId employeeId designation department"),
      UserRole.find({
        userId: { $in: userIds },
        startsAt: { $lte: now },
        $or: [{ endsAt: null }, { endsAt: { $gt: now } }],
      }).populate("roleId", "name"),
    ]);

    const memberByUserId = new Map(members.map((item) => [item.userId.toString(), item]));
    const teacherByUserId = new Map(teachers.map((item) => [item.userId.toString(), item]));
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
      const teacher = teacherByUserId.get(user._id.toString());
      const roles = [...new Set(rolesByUserId.get(user._id.toString()) || [])].sort();
      
      return {
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        isActive: user.isActive,
        userType: teacher ? 'Teacher' : member ? 'Student' : 'User',
        studentId: member?.studentId || null,
        batch: member?.batch || null,
        currentYear: member?.currentYear || null,
        academicYearLevel: member?.academicYearLevel || null,
        memberStatus: member?.membershipStatus?.status || null,
        employeeId: teacher?.employeeId || null,
        designation: teacher?.designation || null,
        department: teacher?.department || null,
        roles,
      };
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEACHER MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  static async listTeachers(query = {}) {
    const filter = { isActive: true };
    
    if (query.search) {
      const teacherIds = await Teacher.find({
        $or: [
          { employeeId: { $regex: query.search, $options: 'i' } },
          { designation: { $regex: query.search, $options: 'i' } },
          { department: { $regex: query.search, $options: 'i' } }
        ]
      }).select('userId');
      
      const userIds = teacherIds.map(t => t.userId);
      filter.$or = [
        { firstName: { $regex: query.search, $options: 'i' } },
        { lastName: { $regex: query.search, $options: 'i' } },
        { email: { $regex: query.search, $options: 'i' } },
        { _id: { $in: userIds } }
      ];
    }
    
    if (query.designation) {
      const teacherIds = await Teacher.find({ designation: query.designation }).select('userId');
      filter._id = { $in: teacherIds.map(t => t.userId) };
    }
    
    const teachers = await Teacher.find({})
      .populate('userId', 'firstName lastName email phone avatarUrl')
      .sort({ createdAt: -1 });
    
    return teachers.map(teacher => ({
      id: teacher._id,
      userId: teacher.userId?._id,
      name: teacher.userId ? `${teacher.userId.firstName} ${teacher.userId.lastName}` : 'N/A',
      email: teacher.userId?.email,
      phone: teacher.userId?.phone,
      employeeId: teacher.employeeId,
      designation: teacher.designation,
      department: teacher.department,
      joiningDate: teacher.joiningDate,
      employmentType: teacher.employmentType,
      isActive: teacher.isActive,
      totalPublications: teacher.totalPublications,
      totalCourses: teacher.totalCoursesTaught,
      profileCompleteness: teacher.profileCompleteness,
      clubRoles: teacher.clubRoles.filter(r => r.isCurrent).map(r => r.role),
      avatarUrl: teacher.userId?.avatarUrl
    }));
  }

  static async getTeacherById(teacherId) {
    const teacher = await Teacher.findById(teacherId)
      .populate('userId', 'firstName lastName email phone avatarUrl socialMedia bio dateOfBirth gender bloodGroup');
    
    if (!teacher) {
      throw new ApiError(404, 'Teacher not found');
    }
    
    return teacher;
  }

  static async createTeacher(payload, actorId, requestId) {
    const { userId, employeeId, designation, department, joiningDate, qualifications, researchInterests, clubRoles } = payload;
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    
    // Check if teacher record already exists
    const existing = await Teacher.findOne({ userId });
    if (existing) {
      throw new ApiError(409, 'Teacher record already exists for this user');
    }
    
    // Check if employee ID is unique
    const duplicateEmpId = await Teacher.findOne({ employeeId });
    if (duplicateEmpId) {
      throw new ApiError(409, 'Employee ID already exists');
    }
    
    const teacher = await Teacher.create({
      userId,
      employeeId,
      designation,
      department: department || "Computer Science and Engineering",
      joiningDate,
      qualifications: qualifications || [],
      researchInterests: researchInterests || [],
      clubRoles: clubRoles || [],
      createdBy: actorId
    });
    
    await AuditService.log({
      actorId,
      action: "TEACHER_CREATED",
      resource: "Teacher",
      resourceId: teacher._id.toString(),
      requestId,
      metadata: { employeeId, designation }
    });
    
    return teacher;
  }

  static async updateTeacher(teacherId, payload, actorId, requestId) {
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      throw new ApiError(404, 'Teacher not found');
    }
    
    Object.assign(teacher, payload);
    teacher.updatedBy = actorId;
    await teacher.save();
    
    await AuditService.log({
      actorId,
      action: "TEACHER_UPDATED",
      resource: "Teacher",
      resourceId: teacher._id.toString(),
      requestId,
      metadata: { employeeId: teacher.employeeId }
    });
    
    return teacher;
  }

  static async deactivateTeacher(teacherId, actorId, requestId) {
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      throw new ApiError(404, 'Teacher not found');
    }
    
    teacher.isActive = false;
    teacher.updatedBy = actorId;
    await teacher.save();
    
    await AuditService.log({
      actorId,
      action: "TEACHER_DEACTIVATED",
      resource: "Teacher",
      resourceId: teacher._id.toString(),
      requestId,
      metadata: { employeeId: teacher.employeeId }
    });
    
    return teacher;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STUDENT MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  static async listStudents(query = {}) {
    const filter = {};
    
    // Search filter
    if (query.search) {
      const memberIds = await Member.find({
        $or: [
          { studentId: { $regex: query.search, $options: 'i' } },
          { batch: isNaN(query.search) ? undefined : parseInt(query.search) }
        ]
      }).select('userId');
      
      const userIds = memberIds.map(m => m.userId);
      filter.$or = [
        { firstName: { $regex: query.search, $options: 'i' } },
        { lastName: { $regex: query.search, $options: 'i' } },
        { email: { $regex: query.search, $options: 'i' } },
        { _id: { $in: userIds } }
      ];
    }
    
    // Build member filter
    const memberFilter = {};
    if (query.batch) memberFilter.batch = parseInt(query.batch);
    if (query.year) memberFilter.currentYear = parseInt(query.year);
    if (query.status) memberFilter['membershipStatus.status'] = query.status;
    if (query.academicYearLevel) memberFilter.academicYearLevel = query.academicYearLevel;
    
    // Get members first
    const members = await Member.find(memberFilter)
      .populate('userId', 'firstName lastName email phone avatarUrl isActive')
      .sort({ batch: -1, studentId: 1 });
    
    return members.map(member => ({
      id: member._id,
      userId: member.userId?._id,
      name: member.userId ? `${member.userId.firstName} ${member.userId.lastName}` : 'N/A',
      email: member.userId?.email,
      phone: member.userId?.phone,
      studentId: member.studentId,
      batch: member.batch,
      currentYear: member.currentYear,
      academicYearLevel: member.academicYearLevel,
      session: member.session,
      membershipStatus: member.membershipStatus.status,
      cgpa: member.academicRecord?.currentCgpa || 'N/A',
      attendance: member.attendanceRecord?.overallAttendancePercentage || 'N/A',
      isActive: member.userId?.isActive,
      ecEligibility: member.electionEligibility.isEligibleForCandidacy,
      votingEligibility: member.electionEligibility.isEligibleForVoting,
      avatarUrl: member.userId?.avatarUrl
    }));
  }

  static async getStudentById(studentId) {
    const member = await Member.findById(studentId)
      .populate('userId', 'firstName lastName email phone avatarUrl socialMedia bio dateOfBirth gender bloodGroup technicalSkills');
    
    if (!member) {
      throw new ApiError(404, 'Student not found');
    }
    
    return member;
  }

  static async updateStudentAcademics(studentId, payload, actorId, requestId) {
    const member = await Member.findById(studentId);
    if (!member) {
      throw new ApiError(404, 'Student not found');
    }
    
    if (payload.academicRecord) {
      Object.assign(member.academicRecord, payload.academicRecord);
    }
    
    if (payload.attendanceRecord) {
      Object.assign(member.attendanceRecord, payload.attendanceRecord);
    }
    
    if (payload.disciplinaryRecord) {
      Object.assign(member.disciplinaryRecord, payload.disciplinaryRecord);
    }
    
    await member.save();
    
    await AuditService.log({
      actorId,
      action: "STUDENT_ACADEMICS_UPDATED",
      resource: "Member",
      resourceId: member._id.toString(),
      requestId,
      metadata: { studentId: member.studentId }
    });
    
    return member;
  }

  static async getStudentStats() {
    const stats = await Member.aggregate([
      {
        $facet: {
          totalStudents: [{ $count: 'count' }],
          byYear: [{ $group: { _id: '$academicYearLevel', count: { $sum: 1 } } }],
          byBatch: [{ $group: { _id: '$batch', count: { $sum: 1 } } }, { $sort: { _id: -1 } }, { $limit: 10 }],
          byStatus: [{ $group: { _id: '$membershipStatus.status', count: { $sum: 1 } } }],
          activeMembers: [{ $match: { 'membershipStatus.status': 'Active' } }, { $count: 'count' }],
          eligibleForEC: [{ $match: { 'electionEligibility.isEligibleForCandidacy': true } }, { $count: 'count' }],
          eligibleForVoting: [{ $match: { 'electionEligibility.isEligibleForVoting': true } }, { $count: 'count' }]
        }
      }
    ]);
    
    return stats[0];
  }

  static async getTeacherStats() {
    const stats = await Teacher.aggregate([
      {
        $facet: {
          totalTeachers: [{ $count: 'count' }],
          byDesignation: [{ $group: { _id: '$designation', count: { $sum: 1 } } }],
          byEmploymentType: [{ $group: { _id: '$employmentType', count: { $sum: 1 } } }],
          activeTeachers: [{ $match: { isActive: true } }, { $count: 'count' }],
          withClubRoles: [{ $match: { 'clubRoles.isCurrent': true } }, { $count: 'count' }],
          totalPublications: [{ $group: { _id: null, total: { $sum: '$totalPublications' } } }],
          totalCourses: [{ $group: { _id: null, total: { $sum: '$totalCoursesTaught' } } }]
        }
      }
    ]);
    
    return stats[0];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ALUMNI MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  static async listAlumni(query = {}) {
    const filter = {
      $or: [
        { academicYearLevel: 'Graduated' },
        { 'membershipStatus.status': 'Graduated' }
      ]
    };
    
    if (query.search) {
      filter.$and = [{
        $or: [
          { studentId: { $regex: query.search, $options: 'i' } },
          { batch: isNaN(query.search) ? undefined : parseInt(query.search) }
        ]
      }];
    }
    
    if (query.batch) {
      filter['alumniInfo.graduatedBatch'] = parseInt(query.batch);
    }
    
    if (query.employmentStatus) {
      filter['alumniInfo.employmentStatus'] = query.employmentStatus;
    }
    
    const alumni = await Member.find(filter)
      .populate('userId', 'firstName lastName email phone avatarUrl socialMedia')
      .sort({ 'alumniInfo.graduatedYear': -1, batch: -1 });
    
    return alumni.map(member => ({
      id: member._id,
      userId: member.userId?._id,
      name: member.userId ? `${member.userId.firstName} ${member.userId.lastName}` : 'N/A',
      email: member.userId?.email,
      phone: member.userId?.phone,
      studentId: member.studentId,
      batch: member.batch,
      graduatedYear: member.alumniInfo?.graduatedYear,
      graduatedBatch: member.alumniInfo?.graduatedBatch,
      finalCgpa: member.alumniInfo?.finalCgpa,
      currentEmployer: member.alumniInfo?.currentEmployer,
      currentPosition: member.alumniInfo?.currentPosition,
      employmentStatus: member.alumniInfo?.employmentStatus,
      higherStudies: member.alumniInfo?.isInHigherStudies ? {
        institution: member.alumniInfo.higherStudiesInstitution,
        degree: member.alumniInfo.higherStudiesDegree,
        country: member.alumniInfo.higherStudiesCountry
      } : null,
      willingToMentor: member.alumniInfo?.willingToMentor,
      profileCompleteness: member.alumniInfo?.profileCompleteness,
      avatarUrl: member.userId?.avatarUrl
    }));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ROLE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

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
