const { ApiResponse } = require("../core/ApiResponse");
const { asyncHandler } = require("../core/asyncHandler");
const { AuthService } = require("../services/AuthService");
const { ApiError } = require("../core/ApiError");

class AuthController {
  static register = asyncHandler(async (req, res) => {
    const result = await AuthService.register(req.body, req.requestMeta);
    res.cookie("refreshToken", result.refreshToken, { httpOnly: true, sameSite: "lax" });
    return ApiResponse.created(res, { user: result.user, accessToken: result.accessToken }, "Registration successful");
  });

  static registerTeacher = asyncHandler(async (req, res) => {
    const result = await AuthService.registerTeacher(req.body, req.requestMeta);
    res.cookie("refreshToken", result.refreshToken, { httpOnly: true, sameSite: "lax" });
    return ApiResponse.created(res, { user: result.user, accessToken: result.accessToken }, "Teacher registered successfully");
  });

  static login = asyncHandler(async (req, res) => {
    const result = await AuthService.login(req.body, req.requestMeta);
    res.cookie("refreshToken", result.refreshToken, { httpOnly: true, sameSite: "lax" });
    return ApiResponse.ok(res, { user: result.user, accessToken: result.accessToken }, "Login successful");
  });

  static refresh = asyncHandler(async (req, res) => {
    const token = req.cookies.refreshToken;
    if (!token) throw new ApiError(401, "Refresh token missing");
    const result = await AuthService.refresh(token);
    return ApiResponse.ok(res, result, "Token refreshed");
  });

  static me = asyncHandler(async (req, res) => {
    const result = await AuthService.getProfile(req.auth.userId);
    return ApiResponse.ok(res, result, "Profile retrieved");
  });

  static updateProfile = asyncHandler(async (req, res) => {
    const result = await AuthService.updateProfile(req.auth.userId, req.body, req.requestMeta);
    return ApiResponse.ok(res, result, "Profile updated successfully");
  });

  static checkEligibility = asyncHandler(async (req, res) => {
    const { checkType } = req.params;
    const requirements = req.body.requirements || {};
    
    const result = await AuthService.checkEligibility(req.auth.userId, checkType, requirements);
    return ApiResponse.ok(res, result, "Eligibility check completed");
  });

  static updateAcademicRecord = asyncHandler(async (req, res) => {
    const result = await AuthService.updateAcademicRecord(req.auth.userId, req.body, req.requestMeta);
    return ApiResponse.ok(res, result, "Academic record updated successfully");
  });

  static logout = asyncHandler(async (req, res) => {
    res.clearCookie("refreshToken");
    return ApiResponse.ok(res, null, "Logged out successfully");
  });

  // Email Verification endpoints
  static sendVerificationEmail = asyncHandler(async (req, res) => {
    const result = await AuthService.sendVerificationEmail(req.auth.userId);
    return ApiResponse.ok(res, result, "Verification email sent successfully");
  });

  static requestVerificationEmail = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const { User } = require("../models/User");
    
    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase(), isActive: true });
    
    // Always return success to prevent email enumeration
    const successResponse = {
      message: "If an account with that email exists and is not verified, a verification link has been sent"
    };

    if (!user) {
      return ApiResponse.ok(res, successResponse);
    }

    // If already verified, still return success
    if (user.emailVerified) {
      return ApiResponse.ok(res, successResponse);
    }

    // Send verification email
    try {
      const result = await AuthService.sendVerificationEmail(user._id);
      return ApiResponse.ok(res, {
        ...successResponse,
        previewUrl: result.previewUrl // For development only
      });
    } catch (error) {
      console.error("Failed to send verification email:", error);
      return ApiResponse.ok(res, successResponse); // Still return success
    }
  });

  static verifyEmail = asyncHandler(async (req, res) => {
    const { token, email } = req.body;
    const result = await AuthService.verifyEmail(token, email);
    return ApiResponse.ok(res, result, "Email verified successfully");
  });

  static requestPasswordReset = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const result = await AuthService.requestPasswordReset(email);
    return ApiResponse.ok(res, result, "Password reset email sent successfully");
  });

  static resetPassword = asyncHandler(async (req, res) => {
    const { token, email, newPassword } = req.body;
    const result = await AuthService.resetPassword(token, email, newPassword);
    return ApiResponse.ok(res, result, "Password reset successfully");
  });

  // Get registration statistics (for admin/moderator)
  static getRegistrationStats = asyncHandler(async (req, res) => {
    const { Member } = require("../models/Member");
    const { User } = require("../models/User");
    
    const [
      totalMembers,
      activeMembers,
      membersByBatch,
      membersByYear,
      eligibleForVoting,
      eligibleForCandidacy,
      profileCompleteness
    ] = await Promise.all([
      Member.countDocuments(),
      Member.countDocuments({ "membershipStatus.status": "Active" }),
      Member.aggregate([
        { $group: { _id: "$batch", count: { $sum: 1 } } },
        { $sort: { _id: -1 } }
      ]),
      Member.aggregate([
        { $group: { _id: "$currentYear", count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      Member.countDocuments({ "electionEligibility.isEligibleForVoting": true }),
      Member.countDocuments({ "electionEligibility.isEligibleForCandidacy": true }),
      User.aggregate([
        {
          $group: {
            _id: null,
            avgCompleteness: { $avg: "$profileCompleteness" },
            highCompleteness: {
              $sum: { $cond: [{ $gte: ["$profileCompleteness", 80] }, 1, 0] }
            },
            mediumCompleteness: {
              $sum: { 
                $cond: [
                  { 
                    $and: [
                      { $gte: ["$profileCompleteness", 50] },
                      { $lt: ["$profileCompleteness", 80] }
                    ]
                  }, 
                  1, 
                  0
                ]
              }
            },
            lowCompleteness: {
              $sum: { $cond: [{ $lt: ["$profileCompleteness", 50] }, 1, 0] }
            }
          }
        }
      ])
    ]);

    const stats = {
      overview: {
        totalMembers,
        activeMembers,
        eligibleForVoting,
        eligibleForCandidacy
      },
      demographics: {
        membersByBatch,
        membersByYear
      },
      profileCompleteness: profileCompleteness[0] || {
        avgCompleteness: 0,
        highCompleteness: 0,
        mediumCompleteness: 0,
        lowCompleteness: 0
      }
    };

    return ApiResponse.ok(res, stats, "Registration statistics retrieved");
  });

  // Get member eligibility report (for election commission)
  static getEligibilityReport = asyncHandler(async (req, res) => {
    const { Member } = require("../models/Member");
    const { batch, year, eligibilityType = "candidacy" } = req.query;
    
    const filter = {};
    if (batch) filter.batch = parseInt(batch);
    if (year) filter.currentYear = parseInt(year);
    
    const members = await Member.find(filter)
      .populate("userId", "firstName lastName email")
      .select("studentId batch currentYear academicRecord attendanceRecord disciplinaryRecord electionEligibility membershipStatus")
      .sort({ batch: -1, studentId: 1 });
    
    const eligibilityReport = members.map(member => {
      const eligibility = eligibilityType === "voting" 
        ? member.checkVotingEligibility()
        : member.checkEcEligibility();
      
      return {
        studentId: member.studentId,
        name: `${member.userId.firstName} ${member.userId.lastName}`,
        email: member.userId.email,
        batch: member.batch,
        currentYear: member.currentYear,
        cgpa: member.academicRecord.currentCgpa,
        attendance: member.attendanceRecord.overallAttendancePercentage,
        disciplinaryActions: member.disciplinaryRecord.totalActions,
        membershipStatus: member.membershipStatus.status,
        isEligible: eligibility.isEligible,
        reasons: eligibility.reasons,
        leadershipScore: member.calculateLeadershipScore()
      };
    });

    const summary = {
      totalMembers: eligibilityReport.length,
      eligibleMembers: eligibilityReport.filter(m => m.isEligible).length,
      ineligibleMembers: eligibilityReport.filter(m => !m.isEligible).length,
      averageCgpa: eligibilityReport.reduce((sum, m) => sum + (m.cgpa || 0), 0) / eligibilityReport.length,
      averageAttendance: eligibilityReport.reduce((sum, m) => sum + (m.attendance || 0), 0) / eligibilityReport.length
    };

    return ApiResponse.ok(res, {
      summary,
      members: eligibilityReport,
      filters: { batch, year, eligibilityType }
    }, "Eligibility report generated");
  });
}

module.exports = { AuthController };
