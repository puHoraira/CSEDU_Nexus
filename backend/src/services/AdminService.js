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
    const users = await User.find({}).sort({ createdAt: -1 }).select("firstName lastName email isActive emailVerified");
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
        emailVerified: user.emailVerified || false,
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
    
    const teachers = await Teacher.find({ isActive: true })
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
    
    // Build member filter - only show Active members (exclude those converted to teachers)
    const memberFilter = {
      'membershipStatus.status': query.status || 'Active'
    };
    if (query.batch) memberFilter.batch = parseInt(query.batch);
    if (query.year) memberFilter.currentYear = parseInt(query.year);
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

    // Allow updating currentYear
    if (payload.currentYear !== undefined) {
      member.currentYear = payload.currentYear;
    }

    // Allow updating academicYearLevel
    if (payload.academicYearLevel) {
      member.academicYearLevel = payload.academicYearLevel;
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

  // ═══════════════════════════════════════════════════════════════════════════
  // USER MANAGEMENT (edit any user, deactivate, change type)
  // ═══════════════════════════════════════════════════════════════════════════

  static async getUserById(userId) {
    const user = await User.findById(userId).select(
      '-passwordHash -passwordResetToken -passwordResetExpires -emailVerificationToken -emailVerificationExpires -twoFactorAuth -loginLockout -passwordResetLockout -devices'
    );
    if (!user) throw new ApiError(404, 'User not found');

    const [member, teacher] = await Promise.all([
      Member.findOne({ userId }),
      Teacher.findOne({ userId }),
    ]);

    let userType = 'User';
    if (teacher && teacher.isActive) userType = 'Teacher';
    else if (member && member.academicYearLevel === 'Graduated') userType = 'Alumni';
    else if (member) userType = 'Student';

    return { user, member, teacher, userType };
  }

  static async updateUser(userId, payload, actorId, requestId) {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, 'User not found');

    const allowedFields = [
      'firstName', 'lastName', 'phone', 'alternativePhone', 'dateOfBirth',
      'gender', 'bloodGroup', 'religion', 'nationality', 'bio',
      'personalStatement', 'hobbies', 'interests',
      'emergencyContact', 'presentAddress', 'permanentAddress', 'socialMedia',
      'technicalSkills', 'softSkills', 'programmingLanguages', 'frameworks', 'tools'
    ];

    const updates = {};
    for (const key of allowedFields) {
      if (payload[key] !== undefined) {
        updates[key] = payload[key];
      }
    }

    Object.assign(user, updates);
    await user.save();

    await AuditService.log({
      actorId,
      action: "USER_UPDATED",
      resource: "User",
      resourceId: user._id.toString(),
      requestId,
      metadata: { updatedFields: Object.keys(updates) }
    });

    return user;
  }

  static async deactivateUser(userId, actorId, requestId) {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, 'User not found');

    user.isActive = false;
    await user.save();

    const [member, teacher] = await Promise.all([
      Member.findOne({ userId }),
      Teacher.findOne({ userId }),
    ]);

    if (member) {
      member.membershipStatus.status = 'Inactive';
      member.membershipStatus.statusReason = 'Deactivated by admin';
      await member.save();
    }
    if (teacher) {
      teacher.isActive = false;
      await teacher.save();
    }

    await AuditService.log({
      actorId,
      action: "USER_DEACTIVATED",
      resource: "User",
      resourceId: user._id.toString(),
      requestId,
      metadata: { email: user.email }
    });

    return { id: userId, deactivated: true };
  }

  static async reactivateUser(userId, actorId, requestId) {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, 'User not found');

    user.isActive = true;
    await user.save();

    const [member, teacher] = await Promise.all([
      Member.findOne({ userId }),
      Teacher.findOne({ userId }),
    ]);

    if (member) {
      member.membershipStatus.status = 'Active';
      member.membershipStatus.statusReason = 'Reactivated by admin';
      await member.save();
    }
    if (teacher) {
      teacher.isActive = true;
      await teacher.save();
    }

    await AuditService.log({
      actorId,
      action: "USER_REACTIVATED",
      resource: "User",
      resourceId: user._id.toString(),
      requestId,
      metadata: { email: user.email }
    });

    return { id: userId, reactivated: true };
  }

  /**
   * Manually verify a user's email (admin bypass)
   */
  static async verifyUserEmail(userId, actorId, requestId) {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, 'User not found');

    if (user.emailVerified) {
      throw new ApiError(400, 'Email is already verified');
    }

    user.emailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    await AuditService.log({
      actorId,
      action: "EMAIL_VERIFIED_BY_ADMIN",
      resource: "User",
      resourceId: user._id.toString(),
      requestId,
      metadata: { 
        email: user.email,
        verifiedBy: "admin"
      }
    });

    return { id: userId, emailVerified: true };
  }

  static async changeUserType(userId, payload, actorId, requestId) {
    const { targetType, typeData } = payload;
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, 'User not found');

    const [existingMember, existingTeacher] = await Promise.all([
      Member.findOne({ userId }),
      Teacher.findOne({ userId }),
    ]);

    // Helper function to convert display year level to enum value
    const normalizeYearLevel = (yearLevel) => {
      const mapping = {
        '1st Year': 'First_Year',
        '2nd Year': 'Second_Year',
        '3rd Year': 'Third_Year',
        '4th Year': 'Fourth_Year',
        'MS': 'Masters',
        'Masters': 'Masters',
        'Graduated': 'Graduated'
      };
      return mapping[yearLevel] || yearLevel;
    };

    // Helper function to normalize designation with spaces to underscores
    const normalizeDesignation = (designation) => {
      if (!designation) return designation;
      // Replace spaces with underscores for enum compatibility
      return designation.replace(/ /g, '_');
    };

    let result = {};

    if (targetType === 'teacher') {
      if (existingTeacher && existingTeacher.isActive) {
        throw new ApiError(409, 'User already has an active teacher record');
      }
      if (existingTeacher) {
        existingTeacher.isActive = true;
        if (typeData.designation) existingTeacher.designation = normalizeDesignation(typeData.designation);
        if (typeData.employeeId) existingTeacher.employeeId = typeData.employeeId;
        if (typeData.department) existingTeacher.department = typeData.department;
        existingTeacher.joiningDate = typeData.joiningDate || new Date();
        await existingTeacher.save();
        result.teacher = existingTeacher;
      } else {
        if (!typeData.employeeId) throw new ApiError(400, 'employeeId is required for teacher');
        if (!typeData.designation) throw new ApiError(400, 'designation is required for teacher');
        const dupId = await Teacher.findOne({ employeeId: typeData.employeeId });
        if (dupId) throw new ApiError(409, 'Employee ID already exists');
        
        result.teacher = await Teacher.create({
          userId,
          employeeId: typeData.employeeId,
          designation: normalizeDesignation(typeData.designation),
          department: typeData.department || 'Computer Science and Engineering',
          joiningDate: typeData.joiningDate || new Date(),
          createdBy: actorId,
        });
      }
      
      // Remove General Member role and add Teacher role
      const generalMemberRole = await Role.findOne({ name: 'General Member' });
      const teacherRole = await Role.findOne({ name: 'Teacher' });
      if (generalMemberRole) {
        await UserRole.deleteMany({ userId, roleId: generalMemberRole._id });
      }
      if (teacherRole) {
        const existingRole = await UserRole.findOne({ userId, roleId: teacherRole._id });
        if (!existingRole) {
          await UserRole.create({ userId, roleId: teacherRole._id });
        }
      }
      
      if (existingMember) {
        existingMember.membershipStatus.status = 'Inactive';
        existingMember.membershipStatus.statusReason = 'Converted to teacher';
        await existingMember.save();
      }
    } else if (targetType === 'student') {
      if (existingMember && existingMember.membershipStatus.status === 'Active') {
        throw new ApiError(409, 'User already has an active student record');
      }
      if (existingMember) {
        existingMember.membershipStatus.status = 'Active';
        existingMember.membershipStatus.statusReason = 'Restored by admin';
        if (typeData.batch) existingMember.batch = typeData.batch;
        if (typeData.currentYear) existingMember.currentYear = typeData.currentYear;
        if (typeData.academicYearLevel) {
          existingMember.academicYearLevel = normalizeYearLevel(typeData.academicYearLevel);
        }
        await existingMember.save();
        result.member = existingMember;
      } else {
        if (!typeData.studentId) throw new ApiError(400, 'studentId is required for student');
        if (!typeData.batch) throw new ApiError(400, 'batch is required for student');
        const dupId = await Member.findOne({ studentId: typeData.studentId });
        if (dupId) throw new ApiError(409, 'Student ID already exists');
        
        const yearLevel = typeData.academicYearLevel 
          ? normalizeYearLevel(typeData.academicYearLevel)
          : 'First_Year';
        
        result.member = await Member.create({
          userId,
          studentId: typeData.studentId,
          batch: typeData.batch,
          currentYear: typeData.currentYear || 1,
          academicYearLevel: yearLevel,
          session: typeData.session || '',
          membershipStatus: { status: 'Active', joinDate: new Date() },
        });
      }
      
      // Remove Teacher role and add General Member role
      const teacherRole = await Role.findOne({ name: 'Teacher' });
      const generalMemberRole = await Role.findOne({ name: 'General Member' });
      if (teacherRole) {
        await UserRole.deleteMany({ userId, roleId: teacherRole._id });
      }
      if (generalMemberRole) {
        const existingRole = await UserRole.findOne({ userId, roleId: generalMemberRole._id });
        if (!existingRole) {
          await UserRole.create({ userId, roleId: generalMemberRole._id });
        }
      }
      
      if (existingTeacher) {
        existingTeacher.isActive = false;
        await existingTeacher.save();
      }
    } else if (targetType === 'alumni') {
      if (!existingMember) {
        throw new ApiError(400, 'User must have a student record to convert to alumni');
      }
      existingMember.academicYearLevel = 'Graduated';
      existingMember.membershipStatus.status = 'Graduated';
      existingMember.membershipStatus.statusReason = 'Converted to alumni by admin';
      existingMember.alumniInfo = {
        ...(existingMember.alumniInfo || {}),
        graduatedYear: typeData.graduatedYear || new Date().getFullYear(),
        graduatedBatch: typeData.graduatedBatch || existingMember.batch,
        finalCgpa: typeData.finalCgpa || existingMember.academicRecord?.currentCgpa,
        currentEmployer: typeData.currentEmployer || '',
        currentPosition: typeData.currentPosition || '',
      };
      await existingMember.save();
      result.member = existingMember;
      
      // Alumni should keep General Member role but could have Alumni-specific role
      const alumniRole = await Role.findOne({ name: 'Alumni' });
      if (alumniRole) {
        const existingRole = await UserRole.findOne({ userId, roleId: alumniRole._id });
        if (!existingRole) {
          await UserRole.create({ userId, roleId: alumniRole._id });
        }
      }
      
      if (existingTeacher) {
        existingTeacher.isActive = false;
        await existingTeacher.save();
      }
    } else {
      throw new ApiError(400, 'targetType must be "student", "teacher", or "alumni"');
    }

    await AuditService.log({
      actorId,
      action: "USER_TYPE_CHANGED",
      resource: "User",
      resourceId: user._id.toString(),
      requestId,
      metadata: { targetType, email: user.email }
    });

    return { userId, targetType, ...result };
  }

  static async getAlumniById(alumniId) {
    const member = await Member.findById(alumniId)
      .populate('userId', 'firstName lastName email phone avatarUrl socialMedia bio dateOfBirth gender bloodGroup technicalSkills');

    if (!member) throw new ApiError(404, 'Alumni not found');
    if (member.academicYearLevel !== 'Graduated' && member.membershipStatus?.status !== 'Graduated') {
      throw new ApiError(400, 'This member is not an alumni');
    }

    return member;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPLETE DELETE USER (Remove all records)
  // ═══════════════════════════════════════════════════════════════════════════

  static async deleteUserCompletely(userId, actorId, requestId) {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, 'User not found');

    // Prevent deleting yourself
    if (userId.toString() === actorId.toString()) {
      throw new ApiError(400, 'You cannot delete yourself');
    }

    // Find all related records
    const [member, teacher] = await Promise.all([
      Member.findOne({ userId }),
      Teacher.findOne({ userId }),
    ]);

    // Delete all user-related records
    await Promise.all([
      // Delete user roles
      UserRole.deleteMany({ userId }),
      // Delete member record if exists
      member ? Member.deleteOne({ _id: member._id }) : Promise.resolve(),
      // Delete teacher record if exists
      teacher ? Teacher.deleteOne({ _id: teacher._id }) : Promise.resolve(),
      // You might want to handle other relations like:
      // - Workshop registrations
      // - Event registrations
      // - Certificates
      // - Notifications
      // - etc.
    ]);

    // Log the deletion
    await AuditService.log({
      actorId,
      action: "USER_DELETED_COMPLETELY",
      resource: "User",
      resourceId: user._id.toString(),
      requestId,
      metadata: { 
        email: user.email, 
        hadMemberRecord: !!member,
        hadTeacherRecord: !!teacher
      }
    });

    // Finally delete the user account
    await User.deleteOne({ _id: userId });

    return { 
      userId, 
      email: user.email,
      deleted: true,
      recordsDeleted: {
        user: true,
        member: !!member,
        teacher: !!teacher,
        roles: true
      }
    };
  }

  static async getAlumniById(alumniId) {
    const member = await Member.findById(alumniId)
      .populate('userId', 'firstName lastName email phone avatarUrl socialMedia bio dateOfBirth gender bloodGroup technicalSkills');

    if (!member) throw new ApiError(404, 'Alumni not found');
    if (member.academicYearLevel !== 'Graduated' && member.membershipStatus?.status !== 'Graduated') {
      throw new ApiError(400, 'This member is not an alumni');
    }

    return member;
  }

  static async deleteUser(userId, actorId, requestId) {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, 'User not found');

    await Promise.all([
      Member.deleteOne({ userId }),
      Teacher.deleteOne({ userId }),
      UserRole.deleteMany({ userId }),
    ]);
    await User.findByIdAndDelete(userId);

    await AuditService.log({
      actorId,
      action: "USER_DELETED",
      resource: "User",
      resourceId: userId,
      requestId,
      metadata: { email: user.email, name: `${user.firstName} ${user.lastName}` }
    });

    return { id: userId, deleted: true };
  }
}

module.exports = { AdminService };
