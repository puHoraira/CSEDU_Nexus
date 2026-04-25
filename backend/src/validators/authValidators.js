const { z } = require("zod");

// Simple registration schema - only required fields for quick registration
const registerSchema = z.object({
  // Authentication (Required)
  email: z.string().email(),
  password: z.string().min(8),
  
  // Personal Information (Required)
  firstName: z.string().min(1).max(60),
  lastName: z.string().min(1).max(60),
  phone: z.string().min(10).max(30),
  
  // Academic Information (Required for students)
  studentId: z.string().min(3).max(50),
  batch: z.number().int().min(2000).max(2100),
  currentYear: z.number().int().min(1).max(5),
  
  // Optional fields for quick registration
  experience: z.string().max(1000).optional().default(""),
  
  // All other fields are optional and can be added later via profile update
  fullNameBangla: z.string().max(120).optional(),
  fatherName: z.string().max(120).optional(),
  motherName: z.string().max(120).optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["Male", "Female", "Other", "Prefer not to say"]).optional(),
  bloodGroup: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"]).optional(),
  religion: z.string().max(50).optional(),
  nationality: z.string().max(50).optional(),
  alternativePhone: z.string().max(30).optional(),
  emergencyContact: z.object({
    name: z.string().max(120).optional(),
    relation: z.string().max(50).optional(),
    phone: z.string().max(30).optional()
  }).optional(),
  presentAddress: z.object({
    division: z.string().max(50).optional(),
    district: z.string().max(50).optional(),
    upazila: z.string().max(50).optional(),
    union: z.string().max(50).optional(),
    village: z.string().max(100).optional(),
    postCode: z.string().max(20).optional(),
    fullAddress: z.string().max(500).optional()
  }).optional(),
  permanentAddress: z.object({
    division: z.string().max(50).optional(),
    district: z.string().max(50).optional(),
    upazila: z.string().max(50).optional(),
    union: z.string().max(50).optional(),
    village: z.string().max(100).optional(),
    postCode: z.string().max(20).optional(),
    fullAddress: z.string().max(500).optional(),
    sameAsPresent: z.boolean().optional()
  }).optional(),
  socialMedia: z.object({
    facebook: z.string().max(200).optional(),
    linkedin: z.string().max(200).optional(),
    github: z.string().max(200).optional(),
    twitter: z.string().max(200).optional(),
    instagram: z.string().max(200).optional(),
    website: z.string().max(200).optional()
  }).optional(),
  bio: z.string().max(500).optional(),
  personalStatement: z.string().max(1000).optional(),
  hobbies: z.array(z.string().max(50)).optional(),
  interests: z.array(z.string().max(50)).optional(),
  technicalSkills: z.array(z.string().max(50)).optional(),
  softSkills: z.array(z.string().max(50)).optional(),
  programmingLanguages: z.array(z.string().max(50)).optional(),
  frameworks: z.array(z.string().max(50)).optional(),
  tools: z.array(z.string().max(50)).optional(),
  workExperience: z.array(z.object({
    company: z.string().max(120),
    position: z.string().max(120),
    duration: z.string().max(50),
    description: z.string().max(500).optional(),
    isCurrentJob: z.boolean().optional()
  })).optional(),
  leadershipExperience: z.array(z.object({
    organization: z.string().max(120),
    position: z.string().max(120),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    description: z.string().max(500).optional(),
    isCurrent: z.boolean().optional()
  })).optional(),
  volunteerExperience: z.array(z.object({
    organization: z.string().max(120),
    role: z.string().max(120),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    description: z.string().max(500).optional(),
    hoursContributed: z.number().min(0).optional()
  })).optional(),
  achievements: z.array(z.object({
    title: z.string().max(200),
    description: z.string().max(500).optional(),
    date: z.string().optional(),
    category: z.enum(["Academic", "Professional", "Competition", "Certification", "Other"]).optional()
  })).optional(),
  certifications: z.array(z.object({
    name: z.string().max(200),
    issuingOrganization: z.string().max(200),
    issueDate: z.string().optional(),
    expiryDate: z.string().optional(),
    credentialId: z.string().max(100).optional(),
    credentialUrl: z.string().max(300).optional()
  })).optional(),
  session: z.string().max(20).optional(),
  admissionYear: z.number().int().min(2000).max(2100).optional(),
  academicRecord: z.object({
    currentCgpa: z.number().min(0).max(4.0).optional(),
    totalCreditsCompleted: z.number().min(0).optional(),
    semesterResults: z.array(z.object({
      semester: z.string().max(10),
      year: z.number().int().min(1).max(5),
      gpa: z.number().min(0).max(4.0),
      creditsCompleted: z.number().min(0).optional(),
      courses: z.array(z.object({
        courseCode: z.string().max(20),
        courseName: z.string().max(200),
        credits: z.number().min(0).max(10).optional(),
        grade: z.string().max(5).optional(),
        gradePoint: z.number().min(0).max(4.0).optional()
      })).optional()
    })).optional()
  }).optional(),
  attendanceRecord: z.object({
    overallAttendancePercentage: z.number().min(0).max(100).optional(),
    semesterAttendance: z.array(z.object({
      semester: z.string().max(10),
      attendancePercentage: z.number().min(0).max(100),
      totalClasses: z.number().min(0).optional(),
      attendedClasses: z.number().min(0).optional()
    })).optional()
  }).optional(),
  politicalAffiliation: z.object({
    hasAffiliation: z.boolean(),
    details: z.string().max(500).optional()
  }).optional(),
  privacySettings: z.object({
    showEmail: z.boolean().optional(),
    showPhone: z.boolean().optional(),
    showAddress: z.boolean().optional(),
    showSocialMedia: z.boolean().optional(),
    allowDirectMessages: z.boolean().optional(),
    showInDirectory: z.boolean().optional()
  }).optional()
});

const registerTeacherSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  designation: z.string().min(2).max(120),
  phone: z.string().max(30).optional().default(""),
  experience: z.string().max(300).optional().default(""),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(60).optional(),
  lastName: z.string().min(1).max(60).optional(),
  fullNameBangla: z.string().max(120).optional(),
  fatherName: z.string().max(120).optional(),
  motherName: z.string().max(120).optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["Male", "Female", "Other", "Prefer not to say"]).optional(),
  bloodGroup: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"]).optional(),
  religion: z.string().max(50).optional(),
  nationality: z.string().max(50).optional(),
  phone: z.string().max(30).optional(),
  alternativePhone: z.string().max(30).optional(),
  emergencyContact: z.object({
    name: z.string().max(120).optional(),
    relation: z.string().max(50).optional(),
    phone: z.string().max(30).optional()
  }).optional(),
  presentAddress: z.object({
    division: z.string().max(50).optional(),
    district: z.string().max(50).optional(),
    upazila: z.string().max(50).optional(),
    union: z.string().max(50).optional(),
    village: z.string().max(100).optional(),
    postCode: z.string().max(20).optional(),
    fullAddress: z.string().max(500).optional()
  }).optional(),
  permanentAddress: z.object({
    division: z.string().max(50).optional(),
    district: z.string().max(50).optional(),
    upazila: z.string().max(50).optional(),
    union: z.string().max(50).optional(),
    village: z.string().max(100).optional(),
    postCode: z.string().max(20).optional(),
    fullAddress: z.string().max(500).optional(),
    sameAsPresent: z.boolean().optional()
  }).optional(),
  socialMedia: z.object({
    facebook: z.string().max(200).optional(),
    linkedin: z.string().max(200).optional(),
    github: z.string().max(200).optional(),
    twitter: z.string().max(200).optional(),
    instagram: z.string().max(200).optional(),
    website: z.string().max(200).optional()
  }).optional(),
  avatarUrl: z.string().url().or(z.literal("")).optional(),
  bio: z.string().max(500).optional(),
  personalStatement: z.string().max(1000).optional(),
  hobbies: z.array(z.string().max(50)).optional(),
  interests: z.array(z.string().max(50)).optional(),
  technicalSkills: z.array(z.string().max(50)).optional(),
  softSkills: z.array(z.string().max(50)).optional(),
  programmingLanguages: z.array(z.string().max(50)).optional(),
  frameworks: z.array(z.string().max(50)).optional(),
  tools: z.array(z.string().max(50)).optional(),
  experience: z.string().max(1000).optional(),
  workExperience: z.array(z.object({
    company: z.string().max(120),
    position: z.string().max(120),
    duration: z.string().max(50),
    description: z.string().max(500).optional(),
    isCurrentJob: z.boolean().optional()
  })).optional(),
  leadershipExperience: z.array(z.object({
    organization: z.string().max(120),
    position: z.string().max(120),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    description: z.string().max(500).optional(),
    isCurrent: z.boolean().optional()
  })).optional(),
  volunteerExperience: z.array(z.object({
    organization: z.string().max(120),
    role: z.string().max(120),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    description: z.string().max(500).optional(),
    hoursContributed: z.number().min(0).optional()
  })).optional(),
  achievements: z.array(z.object({
    title: z.string().max(200),
    description: z.string().max(500).optional(),
    date: z.string().optional(),
    category: z.enum(["Academic", "Professional", "Competition", "Certification", "Other"]).optional()
  })).optional(),
  certifications: z.array(z.object({
    name: z.string().max(200),
    issuingOrganization: z.string().max(200),
    issueDate: z.string().optional(),
    expiryDate: z.string().optional(),
    credentialId: z.string().max(100).optional(),
    credentialUrl: z.string().max(300).optional()
  })).optional(),
  privacySettings: z.object({
    showEmail: z.boolean().optional(),
    showPhone: z.boolean().optional(),
    showAddress: z.boolean().optional(),
    showSocialMedia: z.boolean().optional(),
    allowDirectMessages: z.boolean().optional(),
    showInDirectory: z.boolean().optional()
  }).optional(),
  memberData: z.object({
    academicRecord: z.object({
      currentCgpa: z.number().min(0).max(4.0).optional(),
      semesterResults: z.array(z.any()).optional()
    }).optional(),
    attendanceRecord: z.object({
      overallAttendancePercentage: z.number().min(0).max(100).optional(),
      semesterAttendance: z.array(z.any()).optional()
    }).optional(),
    clubParticipation: z.object({
      eventsParticipated: z.number().min(0).optional(),
      eventsOrganized: z.number().min(0).optional(),
      volunteerHours: z.number().min(0).optional()
    }).optional(),
    communicationPreferences: z.object({
      preferredLanguage: z.enum(["English", "Bengali", "Both"]).optional(),
      emailNotifications: z.boolean().optional(),
      smsNotifications: z.boolean().optional(),
      pushNotifications: z.boolean().optional(),
      newsletterSubscription: z.boolean().optional(),
      eventReminders: z.boolean().optional(),
      electionNotifications: z.boolean().optional()
    }).optional()
  }).optional()
});

module.exports = { registerSchema, registerTeacherSchema, loginSchema, updateProfileSchema };
