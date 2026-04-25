const { body, validationResult } = require("express-validator");
const { ApiError } = require("../core/ApiError");

class RegistrationValidators {
  // Basic registration validation - SIMPLIFIED for quick registration
  static validateBasicRegistration = [
    // Authentication fields
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email is required"),
    
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters"),
    
    // Personal information
    body("firstName")
      .trim()
      .isLength({ min: 1, max: 60 })
      .withMessage("First name is required"),
    
    body("lastName")
      .trim()
      .isLength({ min: 1, max: 60 })
      .withMessage("Last name is required"),
    
    body("phone")
      .trim()
      .isLength({ min: 10, max: 30 })
      .withMessage("Valid phone number is required"),
    
    // Academic information
    body("studentId")
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage("Student ID is required"),
    
    body("batch")
      .isInt({ min: 2000, max: new Date().getFullYear() + 1 })
      .withMessage("Batch must be a valid year"),
    
    body("currentYear")
      .isInt({ min: 1, max: 5 })
      .withMessage("Current year must be between 1 and 5"),
    
    // Optional fields
    body("experience")
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage("Experience must not exceed 1000 characters"),
  ];

  // Comprehensive profile validation - ALL OPTIONAL
  static validateComprehensiveProfile = [
    // Extended personal information - all optional
    body("fullNameBangla")
      .optional()
      .trim()
      .isLength({ max: 120 })
      .withMessage("Bengali name must not exceed 120 characters"),
    
    body("fatherName")
      .optional()
      .trim()
      .isLength({ max: 120 })
      .withMessage("Father's name must not exceed 120 characters"),
    
    body("motherName")
      .optional()
      .trim()
      .isLength({ max: 120 })
      .withMessage("Mother's name must not exceed 120 characters"),
    
    body("dateOfBirth")
      .optional()
      .isISO8601()
      .withMessage("Valid date of birth is required"),
    
    body("gender")
      .optional()
      .isIn(["Male", "Female", "Other", "Prefer not to say"])
      .withMessage("Invalid gender selection"),
    
    body("bloodGroup")
      .optional()
      .isIn(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"])
      .withMessage("Invalid blood group"),
    
    body("religion")
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage("Religion must not exceed 50 characters"),
    
    body("nationality")
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage("Nationality must not exceed 50 characters"),
    
    // Contact information - optional
    body("alternativePhone")
      .optional()
      .trim()
      .isLength({ max: 30 })
      .withMessage("Valid alternative phone number required"),
    
    body("emergencyContact.name")
      .optional()
      .trim()
      .isLength({ max: 120 })
      .withMessage("Emergency contact name must not exceed 120 characters"),
    
    body("emergencyContact.phone")
      .optional()
      .trim()
      .isLength({ max: 30 })
      .withMessage("Valid emergency contact phone required"),
    
    // Address validation - optional
    body("presentAddress.fullAddress")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Present address must not exceed 500 characters"),
    
    body("permanentAddress.fullAddress")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Permanent address must not exceed 500 characters"),
    
    // Social media validation - optional
    body("socialMedia.facebook")
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage("Facebook URL too long"),
    
    body("socialMedia.linkedin")
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage("LinkedIn URL too long"),
    
    body("socialMedia.github")
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage("GitHub URL too long"),
    
    // Academic performance - optional
    body("academicRecord.currentCgpa")
      .optional()
      .isFloat({ min: 0, max: 4.0 })
      .withMessage("CGPA must be between 0.0 and 4.0"),
    
    body("attendanceRecord.overallAttendancePercentage")
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage("Attendance percentage must be between 0 and 100"),
    
    // Skills validation - optional
    body("technicalSkills")
      .optional()
      .isArray()
      .withMessage("Technical skills must be an array"),
    
    body("programmingLanguages")
      .optional()
      .isArray()
      .withMessage("Programming languages must be an array"),
    
    body("softSkills")
      .optional()
      .isArray()
      .withMessage("Soft skills must be an array"),
    
    // Bio and statements - optional
    body("bio")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Bio must not exceed 500 characters"),
    
    body("personalStatement")
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage("Personal statement must not exceed 1000 characters"),
    
    // Session and admission year - optional
    body("session")
      .optional()
      .trim()
      .isLength({ max: 20 })
      .withMessage("Session format invalid"),
    
    body("admissionYear")
      .optional()
      .isInt({ min: 2000, max: new Date().getFullYear() })
      .withMessage("Admission year must be a valid year"),
    
    // Political affiliation - optional
    body("politicalAffiliation.hasAffiliation")
      .optional()
      .isBoolean()
      .withMessage("Political affiliation status must be boolean"),
  ];

  // Academic record validation - ALL OPTIONAL
  static validateAcademicRecord = [
    body("academicRecord.currentCgpa")
      .optional()
      .isFloat({ min: 0, max: 4.0 })
      .withMessage("CGPA must be between 0.0 and 4.0"),
    
    body("academicRecord.totalCreditsCompleted")
      .optional()
      .isInt({ min: 0, max: 200 })
      .withMessage("Credits completed must be between 0 and 200"),
    
    body("academicRecord.semesterResults")
      .optional()
      .isArray()
      .withMessage("Semester results must be an array"),
    
    body("attendanceRecord.overallAttendancePercentage")
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage("Attendance percentage must be between 0 and 100"),
  ];

  // EC experience validation
  static validateEcExperience = [
    body("ecExperience")
      .optional()
      .isArray()
      .withMessage("EC experience must be an array"),
    
    body("ecExperience.*.postName")
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage("Post name must be 2-100 characters"),
    
    body("ecExperience.*.startDate")
      .isISO8601()
      .withMessage("Valid start date required"),
    
    body("ecExperience.*.endDate")
      .optional()
      .isISO8601()
      .withMessage("Valid end date required")
      .custom((value, { req, path }) => {
        const startDate = new Date(req.body.ecExperience[path.split('.')[1]].startDate);
        const endDate = new Date(value);
        if (endDate <= startDate) {
          throw new Error("End date must be after start date");
        }
        return true;
      }),
    
    body("ecExperience.*.performanceRating")
      .optional()
      .isIn(["Excellent", "Good", "Satisfactory", "Needs_Improvement", "Not_Rated"])
      .withMessage("Invalid performance rating"),
  ];

  // Leadership experience validation
  static validateLeadershipExperience = [
    body("leadershipExperience")
      .optional()
      .isArray()
      .withMessage("Leadership experience must be an array"),
    
    body("leadershipExperience.*.organization")
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage("Organization name must be 2-100 characters"),
    
    body("leadershipExperience.*.position")
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage("Position must be 2-100 characters"),
    
    body("volunteerExperience")
      .optional()
      .isArray()
      .withMessage("Volunteer experience must be an array"),
    
    body("volunteerExperience.*.hoursContributed")
      .optional()
      .isInt({ min: 0, max: 10000 })
      .withMessage("Volunteer hours must be between 0 and 10000"),
  ];

  // Achievements validation
  static validateAchievements = [
    body("achievements")
      .optional()
      .isArray()
      .withMessage("Achievements must be an array"),
    
    body("achievements.*.title")
      .trim()
      .isLength({ min: 2, max: 200 })
      .withMessage("Achievement title must be 2-200 characters"),
    
    body("achievements.*.category")
      .isIn(["Academic", "Professional", "Competition", "Certification", "Other"])
      .withMessage("Invalid achievement category"),
    
    body("certifications")
      .optional()
      .isArray()
      .withMessage("Certifications must be an array"),
    
    body("certifications.*.name")
      .trim()
      .isLength({ min: 2, max: 200 })
      .withMessage("Certification name must be 2-200 characters"),
  ];

  // Teacher/Alumni registration validation
  static validateTeacherRegistration = [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email is required"),
    
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters"),
    
    body("firstName")
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("First name must be 2-50 characters"),
    
    body("lastName")
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Last name must be 2-50 characters"),
    
    body("designation")
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage("Designation must be 2-100 characters"),
    
    body("phone")
      .optional()
      .isMobilePhone("bn-BD")
      .withMessage("Valid phone number required"),
    
    body("experience")
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage("Experience must not exceed 2000 characters"),
  ];

  // Eligibility check validation
  static validateEligibilityCheck = [
    body("checkType")
      .isIn(["voting", "candidacy", "ec_post"])
      .withMessage("Invalid eligibility check type"),
    
    body("postId")
      .optional()
      .isMongoId()
      .withMessage("Valid post ID required for EC post eligibility"),
    
    body("requirements.minCgpa")
      .optional()
      .isFloat({ min: 0, max: 4.0 })
      .withMessage("Minimum CGPA must be between 0.0 and 4.0"),
    
    body("requirements.minAttendance")
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage("Minimum attendance must be between 0 and 100"),
    
    body("requirements.maxDisciplinaryActions")
      .optional()
      .isInt({ min: 0, max: 10 })
      .withMessage("Maximum disciplinary actions must be between 0 and 10"),
  ];

  // Validation result handler
  static handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }));
      
      throw new ApiError(400, "Validation failed", errorMessages);
    }
    next();
  };

  // Custom validation for student ID uniqueness
  static validateStudentIdUniqueness = async (studentId) => {
    const { Member } = require("../models/Member");
    const existingMember = await Member.findOne({ studentId });
    if (existingMember) {
      throw new Error("Student ID already registered");
    }
    return true;
  };

  // Custom validation for batch and year consistency
  static validateBatchYearConsistency = (batch, currentYear, admissionYear) => {
    const currentCalendarYear = new Date().getFullYear();
    const expectedCurrentYear = currentCalendarYear - admissionYear + 1;
    
    if (Math.abs(currentYear - expectedCurrentYear) > 1) {
      throw new Error("Current year is inconsistent with admission year");
    }
    
    if (batch !== admissionYear) {
      throw new Error("Batch must match admission year");
    }
    
    return true;
  };

  // Custom validation for CGPA and attendance requirements
  static validateEligibilityRequirements = (cgpa, attendance, disciplinaryActions = 0) => {
    const errors = [];
    
    // Standard EC eligibility requirements
    if (cgpa < 3.0) {
      errors.push("CGPA must be at least 3.0 for EC eligibility");
    }
    
    if (attendance < 75) {
      errors.push("Attendance must be at least 75% for EC eligibility");
    }
    
    if (disciplinaryActions > 0) {
      errors.push("No disciplinary actions allowed for EC eligibility");
    }
    
    if (errors.length > 0) {
      throw new Error(errors.join("; "));
    }
    
    return true;
  };

  // Comprehensive registration validation chain - SIMPLIFIED
  static getRegistrationValidationChain = () => {
    return [
      ...this.validateBasicRegistration,
      this.handleValidationErrors
    ];
  };

  // Teacher registration validation chain
  static getTeacherRegistrationValidationChain = () => {
    return [
      ...this.validateTeacherRegistration,
      this.handleValidationErrors
    ];
  };

  // Profile update validation chain
  static getProfileUpdateValidationChain = () => {
    return [
      ...this.validateComprehensiveProfile,
      ...this.validateEcExperience,
      ...this.validateLeadershipExperience,
      ...this.validateAchievements,
      this.handleValidationErrors
    ];
  };

  // Eligibility check validation chain
  static getEligibilityCheckValidationChain = () => {
    return [
      ...this.validateEligibilityCheck,
      this.handleValidationErrors
    ];
  };
}

module.exports = { RegistrationValidators };