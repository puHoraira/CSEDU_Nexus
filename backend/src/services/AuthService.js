const bcrypt = require("bcryptjs");
const { ApiError } = require("../core/ApiError");
const { User } = require("../models/User");
const { Member } = require("../models/Member");
const { Role } = require("../models/Role");
const { UserRole } = require("../models/UserRole");
const { TokenService } = require("./TokenService");
const { EmailService } = require("./EmailService");
const { AccessService } = require("./AccessService");
const { AuditService } = require("./AuditService");
const { policyRegistry } = require("../policies");

class AuthService {
  static buildAuthUserPayload(user, roles, member = null) {
    return {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      phone: user.phone || "",
      avatarUrl: user.avatarUrl || "",
      bio: user.bio || "",
      experience: user.experience || "",
      designation: user.designation || "",
      profileCompleteness: user.profileCompleteness || 0,
      emailVerified: user.emailVerified || false,
      isVerified: user.isVerified || false,
      roles,
      membership: member ? {
        studentId: member.studentId,
        batch: member.batch,
        currentYear: member.currentYear,
        status: member.membershipStatus.status,
        isEligibleForVoting: member.electionEligibility.isEligibleForVoting,
        isEligibleForCandidacy: member.electionEligibility.isEligibleForCandidacy
      } : null
    };
  }

  static async register(payload, requestMeta) {
    const {
      // Authentication
      email, password,
      
      // Personal Information
      firstName, lastName, fullNameBangla, fatherName, motherName,
      dateOfBirth, gender, bloodGroup, religion, nationality,
      
      // Contact Information
      phone, alternativePhone, emergencyContact,
      
      // Address Information
      presentAddress, permanentAddress,
      
      // Social Media
      socialMedia,
      
      // Profile Information
      bio, personalStatement, hobbies, interests,
      
      // Skills
      technicalSkills, softSkills, programmingLanguages, frameworks, tools,
      
      // Experience
      experience, workExperience, leadershipExperience, volunteerExperience,
      
      // Achievements
      achievements, certifications,
      
      // Academic Information
      studentId, batch, currentYear, session, admissionYear,
      academicRecord, attendanceRecord,
      
      // Political Affiliation
      politicalAffiliation,
      
      // Privacy Settings
      privacySettings
    } = payload;

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new ApiError(409, "Email already exists");
    }

    // Check if student ID already exists
    const existingMember = await Member.findOne({ studentId });
    if (existingMember) {
      throw new ApiError(409, "Student ID already registered");
    }

    // Check political affiliation (Constitutional requirement - Article VI)
    if (politicalAffiliation?.hasAffiliation) {
      throw new ApiError(400, "Students with political party affiliation cannot register (Article VI of Constitution)");
    }

    // Validate membership policy
    const policyResult = await policyRegistry.evaluate("membership.register", { studentId });
    if (!policyResult.allowed) {
      throw new ApiError(409, policyResult.reason || "Membership registration blocked");
    }

    // Calculate expected graduation year and session if not provided
    const calculatedAdmissionYear = admissionYear || batch;
    const expectedGraduationYear = calculatedAdmissionYear + 4;
    const calculatedSession = session || `${batch}-${(batch + 1).toString().slice(-2)}`;

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user with comprehensive information
    const userData = {
      // Authentication
      email: email.toLowerCase(),
      passwordHash,
      
      // Personal Information
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      fullNameBangla: fullNameBangla?.trim() || "",
      fatherName: fatherName?.trim() || "",
      motherName: motherName?.trim() || "",
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      gender: gender || "Prefer not to say",
      bloodGroup: bloodGroup || "Unknown",
      religion: religion?.trim() || "",
      nationality: nationality?.trim() || "Bangladeshi",
      
      // Contact Information
      phone: phone.trim(),
      alternativePhone: alternativePhone?.trim() || "",
      emergencyContact: emergencyContact || {},
      
      // Address Information
      presentAddress: presentAddress || {},
      permanentAddress: permanentAddress || {},
      
      // Social Media
      socialMedia: socialMedia || {},
      
      // Profile Information
      bio: bio?.trim() || "",
      personalStatement: personalStatement?.trim() || "",
      hobbies: hobbies || [],
      interests: interests || [],
      
      // Skills
      technicalSkills: technicalSkills || [],
      softSkills: softSkills || [],
      programmingLanguages: programmingLanguages || [],
      frameworks: frameworks || [],
      tools: tools || [],
      
      // Experience
      experience: experience?.trim() || "",
      workExperience: workExperience || [],
      leadershipExperience: leadershipExperience || [],
      volunteerExperience: volunteerExperience || [],
      
      // Achievements
      achievements: achievements || [],
      certifications: certifications || [],
      
      // Political Affiliation
      politicalAffiliation: {
        hasAffiliation: false,
        details: ""
      },
      
      // Privacy Settings
      privacySettings: privacySettings || {},
      
      // System Information
      isActive: true,
      isVerified: false,
      verificationMethod: "Email",
      registrationSource: "Web"
    };

    const user = await User.create(userData);

    // Create member record with comprehensive information
    const memberData = {
      userId: user._id,
      
      // Academic Information
      studentId: studentId.trim(),
      batch,
      currentYear,
      session: calculatedSession,
      admissionYear: calculatedAdmissionYear,
      expectedGraduationYear,
      
      // Academic Performance
      academicRecord: {
        currentCgpa: academicRecord?.currentCgpa || 0,
        totalCreditsCompleted: academicRecord?.totalCreditsCompleted || 0,
        totalCreditsRequired: 160,
        semesterResults: academicRecord?.semesterResults || [],
        isGraduating: currentYear >= 4,
        graduationDate: currentYear >= 4 ? new Date(expectedGraduationYear, 11, 31) : undefined
      },
      
      // Attendance Record
      attendanceRecord: {
        overallAttendancePercentage: attendanceRecord?.overallAttendancePercentage || 0,
        semesterAttendance: attendanceRecord?.semesterAttendance || [],
        lastUpdated: new Date()
      },
      
      // Disciplinary Record
      disciplinaryRecord: {
        totalActions: 0,
        actions: [],
        hasActiveDisciplinaryActions: false
      },
      
      // EC Experience
      ecExperience: [],
      
      // Club Participation
      clubParticipation: {
        eventsParticipated: 0,
        eventsOrganized: 0,
        volunteerHours: 0,
        committeesServed: [],
        specialContributions: []
      },
      
      // Election Eligibility (will be calculated in pre-save middleware)
      electionEligibility: {
        isEligibleForVoting: true,
        isEligibleForCandidacy: false, // Will be calculated based on CGPA, attendance, etc.
        eligibilityReasons: [],
        lastEligibilityCheck: new Date()
      },
      
      // Election History
      electionHistory: [],
      
      // Membership Status
      membershipStatus: {
        status: "Active",
        statusReason: "New registration",
        statusChangeDate: new Date(),
        joinDate: new Date(),
        lastActiveDate: new Date(),
        expectedExpiryDate: new Date(expectedGraduationYear + 1, 11, 31),
        renewalHistory: []
      },
      
      // Financial Record
      financialRecord: {
        membershipFeesPaid: 0,
        outstandingDues: 0,
        paymentHistory: [],
        scholarshipStatus: {
          hasScholarship: false
        }
      },
      
      // Special Designations
      specialDesignations: [],
      
      // Communication Preferences
      communicationPreferences: {
        preferredLanguage: "English",
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true,
        newsletterSubscription: true,
        eventReminders: true,
        electionNotifications: true
      },
      
      // Registration Metadata
      registrationMetadata: {
        registrationDate: new Date(),
        registrationMethod: "Online_Form",
        verificationDocuments: []
      }
    };

    const member = await Member.create(memberData);

    // Assign General Member role
    const generalMemberRole = await Role.findOne({ name: "General Member" });
    if (generalMemberRole) {
      await UserRole.create({ userId: user._id, roleId: generalMemberRole._id });
    }

    // Get user roles
    const roles = await AccessService.getUserRoleNames(user._id);

    // Generate tokens
    const accessToken = TokenService.createAccessToken({ sub: user._id.toString(), roles });
    const refreshToken = TokenService.createRefreshToken({ sub: user._id.toString() });

    // Log registration
    await AuditService.log({
      actorId: user._id,
      action: "AUTH_REGISTER_COMPREHENSIVE",
      resource: "User",
      resourceId: user._id.toString(),
      requestId: requestMeta?.requestId,
      metadata: { 
        email: user.email,
        studentId: member.studentId,
        batch: member.batch,
        profileCompleteness: user.profileCompleteness,
        cgpa: member.academicRecord.currentCgpa,
        attendance: member.attendanceRecord.overallAttendancePercentage
      },
    });

    return {
      user: this.buildAuthUserPayload(user, roles, member),
      accessToken,
      refreshToken,
    };
  }

  static async registerTeacher(payload, requestMeta) {
    const { email, password, firstName, lastName, designation, phone, experience } = payload;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new ApiError(409, "Email already exists");
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      designation: designation?.trim() || "",
      phone: phone?.trim() || "",
      experience: experience?.trim() || "",
      bio: experience?.trim() || "",
      isActive: true,
      isVerified: false,
      registrationSource: "Web"
    });

    const alumniRole = await Role.findOne({ name: "Alumni" });
    if (!alumniRole) {
      throw new ApiError(500, "Alumni role is missing. Run seed first.");
    }
    await UserRole.create({ userId: user._id, roleId: alumniRole._id });

    const roles = await AccessService.getUserRoleNames(user._id);
    const accessToken = TokenService.createAccessToken({ sub: user._id.toString(), roles });
    const refreshToken = TokenService.createRefreshToken({ sub: user._id.toString() });

    await AuditService.log({
      actorId: user._id,
      action: "AUTH_REGISTER_TEACHER",
      resource: "User",
      resourceId: user._id.toString(),
      requestId: requestMeta?.requestId,
      metadata: { email: user.email, designation, mappedRole: "Alumni" },
    });

    return {
      user: this.buildAuthUserPayload(user, roles),
      accessToken,
      refreshToken,
    };
  }

  static async login({ email, password }, requestMeta) {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.isActive) {
      throw new ApiError(401, "Invalid credentials");
    }

    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      throw new ApiError(401, "Invalid credentials");
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    // Get member information if exists
    const member = await Member.findOne({ userId: user._id });

    const roles = await AccessService.getUserRoleNames(user._id);
    const accessToken = TokenService.createAccessToken({ sub: user._id.toString(), roles });
    const refreshToken = TokenService.createRefreshToken({ sub: user._id.toString() });

    await AuditService.log({
      actorId: user._id,
      action: "AUTH_LOGIN",
      resource: "User",
      resourceId: user._id.toString(),
      requestId: requestMeta?.requestId,
    });

    return {
      user: this.buildAuthUserPayload(user, roles, member),
      accessToken,
      refreshToken,
    };
  }

  static async refresh(token) {
    const payload = TokenService.verifyRefreshToken(token);
    const user = await User.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new ApiError(401, "Invalid refresh token state");
    }

    const roles = await AccessService.getUserRoleNames(user._id);
    const accessToken = TokenService.createAccessToken({ sub: user._id.toString(), roles });
    return { accessToken };
  }

  static async getProfile(userId) {
    const [user, member, roles] = await Promise.all([
      User.findById(userId).select("-passwordHash"),
      Member.findOne({ userId }).populate("ecExperience.termId ecExperience.postId"),
      AccessService.getUserRoleNames(userId),
    ]);

    if (!user) throw new ApiError(404, "User not found");

    return {
      user: this.buildAuthUserPayload(user, roles, member),
      membership: member ? {
        studentId: member.studentId,
        batch: member.batch,
        currentYear: member.currentYear,
        session: member.session,
        status: member.membershipStatus.status,
        academicRecord: member.academicRecord,
        attendanceRecord: member.attendanceRecord,
        ecExperience: member.ecExperience,
        clubParticipation: member.clubParticipation,
        electionEligibility: member.electionEligibility,
        leadershipScore: member.calculateLeadershipScore(),
        yearsInClub: member.yearsInClub,
        yearCorrectionRequest: member.yearCorrectionRequest ?? { status: 'None' },
      } : null,
      account: {
        isActive: user.isActive,
        isVerified: user.isVerified,
        profileCompleteness: user.profileCompleteness,
        joinedAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginAt: user.lastLoginAt
      },
    };
  }

  static async updateProfile(userId, payload, requestMeta) {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, "User not found");

    const member = await Member.findOne({ userId });

    // Update user fields
    const userFields = [
      'firstName', 'lastName', 'fullNameBangla', 'fatherName', 'motherName',
      'dateOfBirth', 'gender', 'bloodGroup', 'religion', 'nationality',
      'phone', 'alternativePhone', 'emergencyContact', 'presentAddress',
      'permanentAddress', 'socialMedia', 'bio', 'personalStatement',
      'hobbies', 'interests', 'technicalSkills', 'softSkills',
      'programmingLanguages', 'frameworks', 'tools', 'experience',
      'workExperience', 'leadershipExperience', 'volunteerExperience',
      'achievements', 'certifications', 'privacySettings', 'avatarUrl'
    ];

    userFields.forEach(field => {
      if (payload[field] !== undefined) {
        user[field] = payload[field];
      }
    });

    await user.save();

    // Update member fields if member exists
    if (member && payload.memberData) {
      const memberFields = [
        'academicRecord', 'attendanceRecord', 'clubParticipation',
        'communicationPreferences'
      ];

      memberFields.forEach(field => {
        if (payload.memberData[field] !== undefined) {
          member[field] = { ...member[field], ...payload.memberData[field] };
        }
      });

      await member.save();
    }

    await AuditService.log({
      actorId: user._id,
      action: "PROFILE_UPDATED_COMPREHENSIVE",
      resource: "User",
      resourceId: user._id.toString(),
      requestId: requestMeta?.requestId,
      metadata: {
        profileCompleteness: user.profileCompleteness,
        fieldsUpdated: Object.keys(payload)
      }
    });

    const roles = await AccessService.getUserRoleNames(user._id);
    return this.buildAuthUserPayload(user, roles, member);
  }

  static async checkEligibility(userId, checkType, requirements = {}) {
    const member = await Member.findOne({ userId });
    if (!member) {
      throw new ApiError(404, "Member not found");
    }

    let eligibility;
    
    switch (checkType) {
      case 'voting':
        eligibility = member.checkVotingEligibility(requirements);
        break;
      case 'candidacy':
      case 'ec_post':
        eligibility = member.checkEcEligibility(requirements);
        break;
      default:
        throw new ApiError(400, "Invalid eligibility check type");
    }

    return {
      isEligible: eligibility.isEligible,
      reasons: eligibility.reasons,
      memberInfo: {
        studentId: member.studentId,
        batch: member.batch,
        currentCgpa: member.academicRecord.currentCgpa,
        attendancePercentage: member.attendanceRecord.overallAttendancePercentage,
        disciplinaryActions: member.disciplinaryRecord.totalActions,
        membershipStatus: member.membershipStatus.status,
        leadershipScore: member.calculateLeadershipScore()
      },
      requirements
    };
  }

  static async updateAcademicRecord(userId, academicData, requestMeta) {
    const member = await Member.findOne({ userId });
    if (!member) {
      throw new ApiError(404, "Member not found");
    }

    // Update academic record
    if (academicData.currentCgpa !== undefined) {
      member.academicRecord.currentCgpa = academicData.currentCgpa;
    }
    
    if (academicData.semesterResults) {
      member.academicRecord.semesterResults = academicData.semesterResults;
    }

    if (academicData.attendancePercentage !== undefined) {
      member.attendanceRecord.overallAttendancePercentage = academicData.attendancePercentage;
      member.attendanceRecord.lastUpdated = new Date();
    }

    await member.save();

    await AuditService.log({
      actorId: userId,
      action: "ACADEMIC_RECORD_UPDATED",
      resource: "Member",
      resourceId: member._id.toString(),
      requestId: requestMeta?.requestId,
      metadata: {
        cgpa: member.academicRecord.currentCgpa,
        attendance: member.attendanceRecord.overallAttendancePercentage
      }
    });

    return {
      academicRecord: member.academicRecord,
      attendanceRecord: member.attendanceRecord,
      electionEligibility: member.electionEligibility
    };
  }

  // Email Verification Methods
  static async sendVerificationEmail(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    if (user.emailVerified) {
      throw new ApiError(400, "Email is already verified");
    }

    // Generate verification token
    const { token, expires } = EmailService.generateVerificationToken();

    // Update user with verification token
    user.emailVerificationToken = token;
    user.emailVerificationExpires = expires;
    await user.save();

    // Send verification email
    const emailResult = await EmailService.sendVerificationEmail(user, token);

    return {
      message: "Verification email sent successfully",
      email: user.email,
      previewUrl: emailResult.previewUrl // For development only
    };
  }

  static async verifyEmail(token, email) {
    const user = await User.findOne({ 
      email: email.toLowerCase(),
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() }
    });

    if (!user) {
      throw new ApiError(400, "Invalid or expired verification token");
    }

    // Mark email as verified
    user.emailVerified = true;
    user.isVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    // Send welcome email
    try {
      await EmailService.sendWelcomeEmail(user);
    } catch (error) {
      console.error("Failed to send welcome email:", error);
      // Don't fail the verification if welcome email fails
    }

    // Log the verification
    await AuditService.log({
      actorId: user._id,
      action: "EMAIL_VERIFIED",
      resource: "User",
      resourceId: user._id.toString(),
      metadata: { email: user.email }
    });

    return {
      message: "Email verified successfully",
      user: {
        id: user._id,
        email: user.email,
        emailVerified: user.emailVerified,
        isVerified: user.isVerified
      }
    };
  }

  static async requestPasswordReset(email) {
    const user = await User.findOne({ 
      email: email.toLowerCase(),
      isActive: true 
    });

    // Always return success to prevent email enumeration
    const successResponse = {
      message: "If an account with that email exists, a password reset link has been sent"
    };

    if (!user) {
      return successResponse;
    }

    // Generate password reset token
    const { token, expires } = EmailService.generatePasswordResetToken();

    // Update user with reset token
    user.passwordResetToken = token;
    user.passwordResetExpires = expires;
    await user.save();

    // Send password reset email
    try {
      const emailResult = await EmailService.sendPasswordResetEmail(user, token);
      
      // Log the reset request
      await AuditService.log({
        actorId: user._id,
        action: "PASSWORD_RESET_REQUESTED",
        resource: "User",
        resourceId: user._id.toString(),
        metadata: { email: user.email }
      });

      return {
        ...successResponse,
        previewUrl: emailResult.previewUrl // For development only
      };
    } catch (error) {
      console.error("Failed to send password reset email:", error);
      return successResponse; // Still return success to prevent information disclosure
    }
  }

  static async resetPassword(token, email, newPassword) {
    const user = await User.findOne({
      email: email.toLowerCase(),
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() },
      isActive: true
    });

    if (!user) {
      throw new ApiError(400, "Invalid or expired password reset token");
    }

    // Validate new password
    if (!newPassword || newPassword.length < 8) {
      throw new ApiError(400, "Password must be at least 8 characters long");
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update user password and clear reset token
    user.passwordHash = passwordHash;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    // Log the password reset
    await AuditService.log({
      actorId: user._id,
      action: "PASSWORD_RESET_COMPLETED",
      resource: "User",
      resourceId: user._id.toString(),
      metadata: { email: user.email }
    });

    return {
      message: "Password reset successfully",
      user: {
        id: user._id,
        email: user.email
      }
    };
  }
}

module.exports = { AuthService };
