const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema(
  {
    // User Reference
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    
    // Academic Information
    studentId: { type: String, required: true, unique: true, trim: true },
    batch: { type: Number, required: true },
    currentYear: { type: Number, required: true, min: 1, max: 5 },
    
    // Year Classification (for filtering content and eligibility)
    academicYearLevel: {
      type: String,
      enum: ["First_Year", "Second_Year", "Third_Year", "Fourth_Year", "Masters", "Graduated"],
      required: true,
      default: "First_Year"
    },
    
    session: { type: String, trim: true }, // e.g., "2020-21"
    admissionYear: { type: Number },
    expectedGraduationYear: { type: Number },
    
    // Promotion History (tracking year-level promotions)
    promotionHistory: [{
      fromYear: { 
        type: String, 
        enum: ["First_Year", "Second_Year", "Third_Year", "Fourth_Year", "Masters", "Graduated"]
      },
      toYear: { 
        type: String, 
        enum: ["First_Year", "Second_Year", "Third_Year", "Fourth_Year", "Masters", "Graduated"]
      },
      promotedAt: { type: Date, default: Date.now },
      promotedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      promotionType: {
        type: String,
        enum: ["Bulk_Promotion", "Individual_Promotion", "Manual_Correction"],
        default: "Bulk_Promotion"
      },
      academicYear: { type: String, trim: true }, // e.g., "2023-2024"
      notes: { type: String, trim: true }
    }],
    
    // Track if student failed and retained in same year
    retentionStatus: {
      isRetained: { type: Boolean, default: false },
      retentionReason: { type: String, trim: true },
      retainedAt: { type: Date },
      retainedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      originalPromotionYear: { type: String, trim: true }
    },
    
    // Academic Performance (Critical for EC eligibility)
    academicRecord: {
      currentCgpa: { type: Number, min: 0, max: 4.0 },
      totalCreditsCompleted: { type: Number, default: 0 },
      totalCreditsRequired: { type: Number, default: 160 },
      semesterResults: [{
        semester: { type: String, trim: true }, // e.g., "1-1", "2-2"
        year: { type: Number },
        gpa: { type: Number, min: 0, max: 4.0 },
        creditsCompleted: { type: Number, default: 0 },
        courses: [{
          courseCode: { type: String, trim: true },
          courseName: { type: String, trim: true },
          credits: { type: Number, default: 3 },
          grade: { type: String, trim: true }, // A+, A, A-, etc.
          gradePoint: { type: Number, min: 0, max: 4.0 }
        }]
      }],
      isGraduating: { type: Boolean, default: false },
      graduationDate: { type: Date }
    },
    
    // Attendance Record (Critical for voting eligibility)
    attendanceRecord: {
      overallAttendancePercentage: { type: Number, min: 0, max: 100 },
      semesterAttendance: [{
        semester: { type: String, trim: true },
        attendancePercentage: { type: Number, min: 0, max: 100 },
        totalClasses: { type: Number, default: 0 },
        attendedClasses: { type: Number, default: 0 }
      }],
      lastUpdated: { type: Date, default: Date.now }
    },
    
    // Disciplinary Record (Critical for EC eligibility)
    disciplinaryRecord: {
      totalActions: { type: Number, default: 0 },
      actions: [{
        type: { 
          type: String, 
          enum: ["Warning", "Suspension", "Fine", "Community_Service", "Probation", "Other"],
          required: true
        },
        reason: { type: String, required: true, trim: true },
        date: { type: Date, required: true },
        severity: { 
          type: String, 
          enum: ["Minor", "Major", "Severe"], 
          default: "Minor" 
        },
        status: { 
          type: String, 
          enum: ["Active", "Resolved", "Appealed", "Overturned"], 
          default: "Active" 
        },
        issuedBy: { type: String, trim: true },
        description: { type: String, trim: true },
        resolutionDate: { type: Date },
        resolutionNotes: { type: String, trim: true }
      }],
      hasActiveDisciplinaryActions: { type: Boolean, default: false }
    },
    
    // EC Experience & Leadership History
    ecExperience: [{
      termId: { type: mongoose.Schema.Types.ObjectId, ref: "EcTerm" },
      postId: { type: mongoose.Schema.Types.ObjectId, ref: "EcPost" },
      postName: { type: String, required: true, trim: true },
      startDate: { type: Date, required: true },
      endDate: { type: Date },
      isCurrent: { type: Boolean, default: false },
      performanceRating: { 
        type: String, 
        enum: ["Excellent", "Good", "Satisfactory", "Needs_Improvement", "Not_Rated"], 
        default: "Not_Rated" 
      },
      achievements: [{ type: String, trim: true }],
      responsibilities: [{ type: String, trim: true }],
      eventsOrganized: { type: Number, default: 0 },
      meetingsAttended: { type: Number, default: 0 },
      totalMeetings: { type: Number, default: 0 }
    }],
    
    // Club Participation & Contributions
    clubParticipation: {
      eventsParticipated: { type: Number, default: 0 },
      eventsOrganized: { type: Number, default: 0 },
      volunteerHours: { type: Number, default: 0 },
      committeesServed: [{ 
        committeeName: { type: String, trim: true },
        role: { type: String, trim: true },
        startDate: { type: Date },
        endDate: { type: Date },
        isCurrent: { type: Boolean, default: false }
      }],
      specialContributions: [{
        type: { 
          type: String, 
          enum: ["Event_Organization", "Technical_Support", "Design_Work", "Content_Creation", "Mentoring", "Other"],
          required: true
        },
        description: { type: String, required: true, trim: true },
        date: { type: Date, required: true },
        recognitionReceived: { type: String, trim: true },
        impactLevel: { 
          type: String, 
          enum: ["High", "Medium", "Low"], 
          default: "Medium" 
        }
      }]
    },
    
    // Election Eligibility & History
    electionEligibility: {
      isEligibleForVoting: { type: Boolean, default: true },
      isEligibleForCandidacy: { type: Boolean, default: true },
      eligibilityReasons: [{
        criterion: { 
          type: String, 
          enum: ["CGPA", "Attendance", "Disciplinary", "Graduation", "Political_Affiliation", "Other"],
          required: true
        },
        status: { 
          type: String, 
          enum: ["Met", "Not_Met", "Under_Review"], 
          required: true 
        },
        value: { type: mongoose.Schema.Types.Mixed }, // Actual value (CGPA, percentage, etc.)
        requiredValue: { type: mongoose.Schema.Types.Mixed }, // Required threshold
        lastChecked: { type: Date, default: Date.now },
        notes: { type: String, trim: true }
      }],
      lastEligibilityCheck: { type: Date, default: Date.now }
    },
    
    electionHistory: [{
      electionId: { type: mongoose.Schema.Types.ObjectId, ref: "Election" },
      electionName: { type: String, trim: true },
      participationType: { 
        type: String, 
        enum: ["Voter", "Candidate", "Commission_Member", "Volunteer"],
        required: true
      },
      phase: { type: Number }, // 1 or 2
      postAppliedFor: { type: String, trim: true },
      candidateStatus: { 
        type: String, 
        enum: ["Applied", "Approved", "Rejected", "Withdrawn", "Elected", "Not_Elected"]
      },
      votesReceived: { type: Number, default: 0 },
      rank: { type: Number },
      hasVoted: { type: Boolean, default: false },
      electionDate: { type: Date }
    }],
    
    // Membership Status & History
    membershipStatus: {
      status: {
        type: String,
        enum: ["Active", "Inactive", "Suspended", "Cancelled", "Expired", "Graduated"],
        default: "Active",
      },
      statusReason: { type: String, trim: true },
      statusChangeDate: { type: Date, default: Date.now },
      statusChangedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      
      // Membership lifecycle
      joinDate: { type: Date, default: Date.now },
      lastActiveDate: { type: Date, default: Date.now },
      expectedExpiryDate: { type: Date },
      actualExpiryDate: { type: Date },
      
      // Renewal information
      renewalHistory: [{
        renewalDate: { type: Date },
        renewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        previousStatus: { type: String },
        newStatus: { type: String },
        reason: { type: String, trim: true }
      }]
    },
    
    // Financial Information
    financialRecord: {
      membershipFeesPaid: { type: Number, default: 0 },
      outstandingDues: { type: Number, default: 0 },
      paymentHistory: [{
        amount: { type: Number, required: true },
        purpose: { type: String, required: true, trim: true },
        paymentDate: { type: Date, required: true },
        paymentMethod: { 
          type: String, 
          enum: ["Cash", "Bank_Transfer", "Mobile_Banking", "Card", "Other"],
          default: "Cash"
        },
        receiptNumber: { type: String, trim: true },
        receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
      }],
      scholarshipStatus: {
        hasScholarship: { type: Boolean, default: false },
        scholarshipType: { type: String, trim: true },
        scholarshipAmount: { type: Number, default: 0 },
        scholarshipProvider: { type: String, trim: true }
      }
    },
    
    // Special Designations & Recognitions
    specialDesignations: [{
      designation: { 
        type: String, 
        enum: ["Outstanding_Member", "Volunteer_of_the_Year", "Leadership_Award", "Academic_Excellence", "Special_Contributor", "Other"],
        required: true
      },
      awardedDate: { type: Date, required: true },
      awardedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      description: { type: String, trim: true },
      certificateIssued: { type: Boolean, default: false },
      certificateNumber: { type: String, trim: true }
    }],
    
    // Communication Preferences
    communicationPreferences: {
      preferredLanguage: { 
        type: String, 
        enum: ["English", "Bengali", "Both"], 
        default: "English" 
      },
      emailNotifications: { type: Boolean, default: true },
      smsNotifications: { type: Boolean, default: false },
      pushNotifications: { type: Boolean, default: true },
      newsletterSubscription: { type: Boolean, default: true },
      eventReminders: { type: Boolean, default: true },
      electionNotifications: { type: Boolean, default: true }
    },
    
    // System Metadata
    registrationMetadata: {
      registrationDate: { type: Date, default: Date.now },
      registrationMethod: { 
        type: String, 
        enum: ["Online_Form", "Manual_Entry", "Bulk_Import", "Migration"], 
        default: "Online_Form" 
      },
      registeredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      approvalDate: { type: Date },
      verificationDocuments: [{
        documentType: { 
          type: String, 
          enum: ["Student_ID", "Transcript", "Photo", "Birth_Certificate", "Other"],
          required: true
        },
        documentUrl: { type: String, trim: true },
        uploadDate: { type: Date, default: Date.now },
        verificationStatus: { 
          type: String, 
          enum: ["Pending", "Verified", "Rejected"], 
          default: "Pending" 
        },
        verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        verificationDate: { type: Date },
        rejectionReason: { type: String, trim: true }
      }]
    },

    // Year Correction Request (student can request, moderator approves)
    yearCorrectionRequest: {
      status: {
        type: String,
        enum: ["None", "Pending", "Approved", "Rejected"],
        default: "None",
      },
      requestedYear: { type: Number, min: 1, max: 5 },
      reason: { type: String, trim: true },
      requestedAt: { type: Date },
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      reviewedAt: { type: Date },
      reviewNote: { type: String, trim: true },
    },
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for years in club
memberSchema.virtual('yearsInClub').get(function() {
  const joinDate = this.membershipStatus.joinDate || this.createdAt;
  const today = new Date();
  return Math.floor((today - joinDate) / (365.25 * 24 * 60 * 60 * 1000));
});

// Virtual for current academic year
memberSchema.virtual('currentAcademicYear').get(function() {
  const currentYear = new Date().getFullYear();
  const admissionYear = this.admissionYear;
  return Math.min(currentYear - admissionYear + 1, 5);
});

// Method to check EC eligibility
memberSchema.methods.checkEcEligibility = function(requirements = {}) {
  const {
    minCgpa = 3.0,
    minAttendance = 75,
    maxDisciplinaryActions = 0,
    excludeGraduating = true
  } = requirements;
  
  const eligibility = {
    isEligible: true,
    reasons: []
  };
  
  // Check CGPA
  if (this.academicRecord.currentCgpa < minCgpa) {
    eligibility.isEligible = false;
    eligibility.reasons.push(`CGPA ${this.academicRecord.currentCgpa} is below required ${minCgpa}`);
  }
  
  // Check attendance
  if (this.attendanceRecord.overallAttendancePercentage < minAttendance) {
    eligibility.isEligible = false;
    eligibility.reasons.push(`Attendance ${this.attendanceRecord.overallAttendancePercentage}% is below required ${minAttendance}%`);
  }
  
  // Check disciplinary actions
  if (this.disciplinaryRecord.totalActions > maxDisciplinaryActions) {
    eligibility.isEligible = false;
    eligibility.reasons.push(`Has ${this.disciplinaryRecord.totalActions} disciplinary actions (max allowed: ${maxDisciplinaryActions})`);
  }
  
  // Check if graduating
  if (excludeGraduating && this.academicRecord.isGraduating) {
    eligibility.isEligible = false;
    eligibility.reasons.push('Student is graduating this year');
  }
  
  // Check active disciplinary actions
  if (this.disciplinaryRecord.hasActiveDisciplinaryActions) {
    eligibility.isEligible = false;
    eligibility.reasons.push('Has active disciplinary actions');
  }
  
  // Check membership status
  if (this.membershipStatus.status !== 'Active') {
    eligibility.isEligible = false;
    eligibility.reasons.push(`Membership status is ${this.membershipStatus.status}`);
  }
  
  return eligibility;
};

// Method to promote student to next year level
memberSchema.methods.promoteToNextYear = function(promotedBy, notes = '', promotionType = 'Bulk_Promotion') {
  const yearProgression = {
    'First_Year': 'Second_Year',
    'Second_Year': 'Third_Year',
    'Third_Year': 'Fourth_Year',
    'Fourth_Year': 'Masters',
    'Masters': 'Graduated'
  };
  
  const fromYear = this.academicYearLevel;
  const toYear = yearProgression[fromYear];
  
  if (!toYear) {
    throw new Error(`Cannot promote from ${fromYear}`);
  }
  
  // Add to promotion history
  this.promotionHistory.push({
    fromYear,
    toYear,
    promotedAt: new Date(),
    promotedBy,
    promotionType,
    academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
    notes
  });
  
  // Update current year level
  this.academicYearLevel = toYear;
  
  // Update currentYear numeric field
  const yearLevelToNumber = {
    'First_Year': 1,
    'Second_Year': 2,
    'Third_Year': 3,
    'Fourth_Year': 4,
    'Masters': 5,
    'Graduated': 5
  };
  this.currentYear = yearLevelToNumber[toYear];
  
  // Clear retention status if promoted
  if (this.retentionStatus.isRetained) {
    this.retentionStatus.isRetained = false;
  }
  
  // Update membership status if graduated
  if (toYear === 'Graduated') {
    this.membershipStatus.status = 'Graduated';
    this.membershipStatus.statusReason = 'Student graduated';
    this.membershipStatus.statusChangeDate = new Date();
    this.academicRecord.isGraduating = true;
    this.academicRecord.graduationDate = new Date();
  }
  
  return this;
};

// Method to retain student in current year (failed)
memberSchema.methods.retainInCurrentYear = function(retainedBy, reason = '') {
  this.retentionStatus = {
    isRetained: true,
    retentionReason: reason,
    retainedAt: new Date(),
    retainedBy,
    originalPromotionYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`
  };
  
  return this;
};

// Static method to get next year level
memberSchema.statics.getNextYearLevel = function(currentLevel) {
  const yearProgression = {
    'First_Year': 'Second_Year',
    'Second_Year': 'Third_Year',
    'Third_Year': 'Fourth_Year',
    'Fourth_Year': 'Masters',
    'Masters': 'Graduated'
  };
  return yearProgression[currentLevel] || null;
};

// Method to check voting eligibility
memberSchema.methods.checkVotingEligibility = function(requirements = {}) {
  const {
    minAttendance = 60,
    excludeSuspended = true
  } = requirements;
  
  const eligibility = {
    isEligible: true,
    reasons: []
  };
  
  // Check attendance for voting
  if (this.attendanceRecord.overallAttendancePercentage < minAttendance) {
    eligibility.isEligible = false;
    eligibility.reasons.push(`Attendance ${this.attendanceRecord.overallAttendancePercentage}% is below required ${minAttendance}%`);
  }
  
  // Check membership status
  if (excludeSuspended && ['Suspended', 'Cancelled', 'Expired'].includes(this.membershipStatus.status)) {
    eligibility.isEligible = false;
    eligibility.reasons.push(`Membership status is ${this.membershipStatus.status}`);
  }
  
  return eligibility;
};

// Method to calculate leadership score
memberSchema.methods.calculateLeadershipScore = function() {
  let score = 0;
  
  // EC experience points
  score += this.ecExperience.length * 10;
  this.ecExperience.forEach(exp => {
    if (exp.performanceRating === 'Excellent') score += 5;
    else if (exp.performanceRating === 'Good') score += 3;
    score += exp.eventsOrganized * 2;
  });
  
  // Club participation points
  score += this.clubParticipation.eventsOrganized * 3;
  score += this.clubParticipation.eventsParticipated * 1;
  score += Math.floor(this.clubParticipation.volunteerHours / 10);
  
  // Special contributions
  this.clubParticipation.specialContributions.forEach(contrib => {
    if (contrib.impactLevel === 'High') score += 5;
    else if (contrib.impactLevel === 'Medium') score += 3;
    else score += 1;
  });
  
  // Special designations
  score += this.specialDesignations.length * 8;
  
  return Math.min(score, 100); // Cap at 100
};

// Pre-save middleware to update eligibility
memberSchema.pre('save', function(next) {
  // Update eligibility status
  const ecEligibility = this.checkEcEligibility();
  const votingEligibility = this.checkVotingEligibility();
  
  this.electionEligibility.isEligibleForCandidacy = ecEligibility.isEligible;
  this.electionEligibility.isEligibleForVoting = votingEligibility.isEligible;
  this.electionEligibility.lastEligibilityCheck = new Date();
  
  // Update eligibility reasons
  this.electionEligibility.eligibilityReasons = [];
  
  // Add CGPA check
  this.electionEligibility.eligibilityReasons.push({
    criterion: 'CGPA',
    status: this.academicRecord.currentCgpa >= 3.0 ? 'Met' : 'Not_Met',
    value: this.academicRecord.currentCgpa,
    requiredValue: 3.0,
    lastChecked: new Date()
  });
  
  // Add attendance check
  this.electionEligibility.eligibilityReasons.push({
    criterion: 'Attendance',
    status: this.attendanceRecord.overallAttendancePercentage >= 75 ? 'Met' : 'Not_Met',
    value: this.attendanceRecord.overallAttendancePercentage,
    requiredValue: 75,
    lastChecked: new Date()
  });
  
  // Add disciplinary check
  this.electionEligibility.eligibilityReasons.push({
    criterion: 'Disciplinary',
    status: this.disciplinaryRecord.totalActions === 0 ? 'Met' : 'Not_Met',
    value: this.disciplinaryRecord.totalActions,
    requiredValue: 0,
    lastChecked: new Date()
  });
  
  next();
});

// Indexes for efficient queries
memberSchema.index({ userId: 1 });
memberSchema.index({ studentId: 1 });
memberSchema.index({ batch: 1 });
memberSchema.index({ academicYearLevel: 1 });
memberSchema.index({ 'membershipStatus.status': 1 });
memberSchema.index({ 'academicRecord.currentCgpa': -1 });
memberSchema.index({ 'attendanceRecord.overallAttendancePercentage': -1 });
memberSchema.index({ 'electionEligibility.isEligibleForCandidacy': 1 });
memberSchema.index({ 'electionEligibility.isEligibleForVoting': 1 });
memberSchema.index({ 'retentionStatus.isRetained': 1 });
memberSchema.index({ createdAt: -1 });

const Member = mongoose.model("Member", memberSchema);

module.exports = { Member };
