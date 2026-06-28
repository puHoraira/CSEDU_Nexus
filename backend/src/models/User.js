const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    // Basic Authentication
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    
    // Personal Information
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    fullNameBangla: { type: String, default: "", trim: true },
    fatherName: { type: String, default: "", trim: true },
    motherName: { type: String, default: "", trim: true },
    dateOfBirth: { type: Date },
    gender: { 
      type: String, 
      enum: ["Male", "Female", "Other", "Prefer not to say"], 
      default: "Prefer not to say" 
    },
    bloodGroup: { 
      type: String, 
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"], 
      default: "Unknown" 
    },
    religion: { type: String, default: "", trim: true },
    nationality: { type: String, default: "Bangladeshi", trim: true },
    
    // Contact Information
    phone: { type: String, required: true, trim: true },
    alternativePhone: { type: String, default: "", trim: true },
    emergencyContact: {
      name: { type: String, default: "", trim: true },
      relation: { type: String, default: "", trim: true },
      phone: { type: String, default: "", trim: true }
    },
    
    // Address Information
    presentAddress: {
      division: { type: String, default: "", trim: true },
      district: { type: String, default: "", trim: true },
      upazila: { type: String, default: "", trim: true },
      union: { type: String, default: "", trim: true },
      village: { type: String, default: "", trim: true },
      postCode: { type: String, default: "", trim: true },
      fullAddress: { type: String, default: "", trim: true }
    },
    permanentAddress: {
      division: { type: String, default: "", trim: true },
      district: { type: String, default: "", trim: true },
      upazila: { type: String, default: "", trim: true },
      union: { type: String, default: "", trim: true },
      village: { type: String, default: "", trim: true },
      postCode: { type: String, default: "", trim: true },
      fullAddress: { type: String, default: "", trim: true },
      sameAsPresent: { type: Boolean, default: false }
    },
    
    // Social Media & Online Presence
    socialMedia: {
      facebook: { type: String, default: "", trim: true },
      linkedin: { type: String, default: "", trim: true },
      github: { type: String, default: "", trim: true },
      twitter: { type: String, default: "", trim: true },
      instagram: { type: String, default: "", trim: true },
      website: { type: String, default: "", trim: true }
    },
    
    // Profile & Bio
    avatarUrl: { type: String, default: "", trim: true },
    bio: { type: String, default: "", trim: true },
    personalStatement: { type: String, default: "", trim: true },
    hobbies: [{ type: String, trim: true }],
    interests: [{ type: String, trim: true }],
    
    // Skills & Experience
    technicalSkills: [{ type: String, trim: true }],
    softSkills: [{ type: String, trim: true }],
    programmingLanguages: [{ type: String, trim: true }],
    frameworks: [{ type: String, trim: true }],
    tools: [{ type: String, trim: true }],
    
    // Professional Information
    experience: { type: String, default: "", trim: true },
    designation: { type: String, default: "", trim: true },
    workExperience: [{
      company: { type: String, trim: true },
      position: { type: String, trim: true },
      duration: { type: String, trim: true },
      description: { type: String, trim: true },
      isCurrentJob: { type: Boolean, default: false }
    }],
    
    // Achievements & Certifications
    achievements: [{
      title: { type: String, trim: true },
      description: { type: String, trim: true },
      date: { type: Date },
      category: { 
        type: String, 
        enum: ["Academic", "Professional", "Competition", "Certification", "Other"],
        default: "Other"
      }
    }],
    certifications: [{
      name: { type: String, trim: true },
      issuingOrganization: { type: String, trim: true },
      issueDate: { type: Date },
      expiryDate: { type: Date },
      credentialId: { type: String, trim: true },
      credentialUrl: { type: String, trim: true }
    }],
    
    // Leadership & Volunteer Experience
    leadershipExperience: [{
      organization: { type: String, trim: true },
      position: { type: String, trim: true },
      startDate: { type: Date },
      endDate: { type: Date },
      description: { type: String, trim: true },
      isCurrent: { type: Boolean, default: false }
    }],
    volunteerExperience: [{
      organization: { type: String, trim: true },
      role: { type: String, trim: true },
      startDate: { type: Date },
      endDate: { type: Date },
      description: { type: String, trim: true },
      hoursContributed: { type: Number, default: 0 }
    }],
    
    // Political & Legal Information (for constitutional compliance)
    politicalAffiliation: {
      hasAffiliation: { type: Boolean, default: false },
      details: { type: String, default: "", trim: true } // Will be rejected if true per Article VI
    },
    
    // System Information
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    emailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, default: null },
    emailVerificationExpires: { type: Date, default: null },
    passwordResetToken: { type: String, default: null },
    passwordResetExpires: { type: Date, default: null },
    
    // Security & Authentication
    twoFactorAuth: {
      enabled: { type: Boolean, default: false },
      secret: { type: String, default: null },
      backupCodes: [{
        code: { type: String },
        used: { type: Boolean, default: false },
        usedAt: { type: Date }
      }],
      enabledAt: { type: Date },
      disabledAt: { type: Date }
    },
    
    // Account Security
    loginLockout: {
      attempts: { type: Number, default: 0 },
      lockedUntil: { type: Date },
      lastAttempt: { type: Date }
    },
    passwordResetLockout: {
      attempts: { type: Number, default: 0 },
      lockedUntil: { type: Date },
      lastAttempt: { type: Date }
    },
    
    // Device Tracking
    devices: [{
      fingerprint: { type: String },
      userAgent: { type: String },
      firstSeen: { type: Date },
      lastSeen: { type: Date },
      lastSuccessfulLogin: { type: Date },
      trusted: { type: Boolean, default: false },
      loginAttempts: { type: Number, default: 0 },
      failedAttempts: { type: Number, default: 0 }
    }],
    verificationMethod: { 
      type: String, 
      enum: ["Email", "Phone", "Manual", "Student_ID"], 
      default: "Email" 
    },
    registrationSource: { 
      type: String, 
      enum: ["Web", "Mobile", "Admin", "Import"], 
      default: "Web" 
    },
    lastLoginAt: { type: Date },
    profileCompleteness: { type: Number, default: 0, min: 0, max: 100 },
    
    // Privacy Settings
    privacySettings: {
      showEmail: { type: Boolean, default: false },
      showPhone: { type: Boolean, default: false },
      showAddress: { type: Boolean, default: false },
      showSocialMedia: { type: Boolean, default: true },
      allowDirectMessages: { type: Boolean, default: true },
      showInDirectory: { type: Boolean, default: true }
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for age calculation
userSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

// Method to calculate profile completeness
userSchema.methods.calculateProfileCompleteness = function() {
  const requiredFields = [
    'firstName', 'lastName', 'email', 'phone', 'dateOfBirth', 'gender',
    'presentAddress.fullAddress', 'bio'
  ];
  
  const optionalFields = [
    'fullNameBangla', 'fatherName', 'motherName', 'bloodGroup', 'avatarUrl',
    'socialMedia.facebook', 'socialMedia.linkedin', 'technicalSkills',
    'personalStatement', 'hobbies', 'interests'
  ];
  
  let completedRequired = 0;
  let completedOptional = 0;
  
  // Check required fields (70% weight)
  requiredFields.forEach(field => {
    const value = field.split('.').reduce((obj, key) => obj?.[key], this);
    if (value && value.toString().trim() !== '') {
      completedRequired++;
    }
  });
  
  // Check optional fields (30% weight)
  optionalFields.forEach(field => {
    const value = field.split('.').reduce((obj, key) => obj?.[key], this);
    if (value && (Array.isArray(value) ? value.length > 0 : value.toString().trim() !== '')) {
      completedOptional++;
    }
  });
  
  const requiredScore = (completedRequired / requiredFields.length) * 70;
  const optionalScore = (completedOptional / optionalFields.length) * 30;
  
  return Math.round(requiredScore + optionalScore);
};

// Pre-save middleware to update profile completeness
userSchema.pre('save', function(next) {
  this.profileCompleteness = this.calculateProfileCompleteness();
  next();
});

// Index for efficient queries
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ emailVerified: 1 });
userSchema.index({ emailVerificationToken: 1 });
userSchema.index({ passwordResetToken: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ profileCompleteness: -1 });

const User = mongoose.model("User", userSchema);

module.exports = { User };
