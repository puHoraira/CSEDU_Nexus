const mongoose = require("mongoose");

const teacherSchema = new mongoose.Schema(
  {
    // User Reference
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    
    // Academic Information
    employeeId: { type: String, required: true, unique: true, trim: true },
    designation: {
      type: String,
      enum: [
        "Professor",
        "Associate_Professor",
        "Assistant_Professor",
        "Lecturer",
        "Assistant_Programmer",
        "Lab_Instructor",
        "Adjunct_Faculty",
        "Visiting_Faculty",
        "Research_Associate",
        "Other"
      ],
      required: true
    },
    department: { type: String, default: "Computer Science and Engineering", trim: true },
    joiningDate: { type: Date, required: true },
    
    // Employment Status
    employmentType: {
      type: String,
      enum: ["Permanent", "Contractual", "Part_Time", "Visiting"],
      default: "Permanent"
    },
    isActive: { type: Boolean, default: true },
    retirementDate: { type: Date },
    
    // Academic Qualifications
    qualifications: [{
      degree: { type: String, required: true, trim: true }, // e.g., "PhD in Computer Science"
      institution: { type: String, required: true, trim: true },
      country: { type: String, trim: true },
      completionYear: { type: Number },
      fieldOfStudy: { type: String, trim: true },
      thesis: { type: String, trim: true }
    }],
    
    // Research Interests
    researchInterests: [{ type: String, trim: true }],
    researchArea: {
      type: String,
      enum: [
        "Artificial_Intelligence",
        "Machine_Learning",
        "Data_Science",
        "Computer_Networks",
        "Software_Engineering",
        "Cyber_Security",
        "Computer_Graphics",
        "Database_Systems",
        "Web_Technologies",
        "Mobile_Computing",
        "Cloud_Computing",
        "IoT",
        "Blockchain",
        "Theory_of_Computation",
        "Algorithm_Design",
        "Other"
      ]
    },
    
    // Publications & Research
    publications: [{
      title: { type: String, required: true, trim: true },
      authors: [{ type: String, trim: true }],
      venue: { type: String, trim: true }, // Journal/Conference name
      year: { type: Number },
      type: {
        type: String,
        enum: ["Journal", "Conference", "Workshop", "Book_Chapter", "Book", "Patent", "Other"],
        default: "Journal"
      },
      doi: { type: String, trim: true },
      url: { type: String, trim: true },
      citationCount: { type: Number, default: 0 }
    }],
    
    totalPublications: { type: Number, default: 0 },
    totalCitations: { type: Number, default: 0 },
    hIndex: { type: Number, default: 0 },
    
    // Teaching Experience
    coursesTeaching: [{
      courseCode: { type: String, required: true, trim: true },
      courseName: { type: String, required: true, trim: true },
      courseType: {
        type: String,
        enum: ["Theory", "Lab", "Project", "Thesis"],
        default: "Theory"
      },
      level: {
        type: String,
        enum: ["Undergraduate", "Masters", "PhD"],
        default: "Undergraduate"
      },
      semester: { type: String, trim: true }, // e.g., "Spring 2024"
      studentCount: { type: Number, default: 0 }
    }],
    
    totalCoursesTaught: { type: Number, default: 0 },
    totalStudentsTaught: { type: Number, default: 0 },
    
    // Thesis/Project Supervision
    studentsSupervised: [{
      studentId: { type: String, trim: true },
      studentName: { type: String, trim: true },
      projectTitle: { type: String, trim: true },
      projectType: {
        type: String,
        enum: ["BSc_Thesis", "Masters_Thesis", "PhD_Thesis", "Project", "Internship"],
        default: "BSc_Thesis"
      },
      startDate: { type: Date },
      completionDate: { type: Date },
      status: {
        type: String,
        enum: ["Ongoing", "Completed", "Discontinued"],
        default: "Ongoing"
      },
      grade: { type: String, trim: true }
    }],
    
    totalThesisSupervised: { type: Number, default: 0 },
    ongoingSupervisions: { type: Number, default: 0 },
    
    // Administrative Roles
    administrativeRoles: [{
      role: { type: String, required: true, trim: true }, // e.g., "Head of Department", "Exam Controller"
      startDate: { type: Date, required: true },
      endDate: { type: Date },
      isCurrent: { type: Boolean, default: false },
      responsibilities: [{ type: String, trim: true }]
    }],
    
    // Club Involvement
    clubRoles: [{
      role: {
        type: String,
        enum: ["Moderator", "Chief_Patron", "Chairman", "Advisor", "Mentor", "Guest_Speaker"],
        required: true
      },
      startDate: { type: Date, required: true },
      endDate: { type: Date },
      isCurrent: { type: Boolean, default: true },
      contributions: [{ type: String, trim: true }]
    }],
    
    // Awards & Recognitions
    awards: [{
      awardName: { type: String, required: true, trim: true },
      awardingOrganization: { type: String, trim: true },
      year: { type: Number },
      description: { type: String, trim: true },
      category: {
        type: String,
        enum: ["Teaching", "Research", "Service", "Innovation", "Other"],
        default: "Other"
      }
    }],
    
    // Professional Memberships
    professionalMemberships: [{
      organization: { type: String, required: true, trim: true }, // e.g., "IEEE", "ACM"
      membershipType: { type: String, trim: true }, // e.g., "Senior Member", "Fellow"
      membershipId: { type: String, trim: true },
      joinDate: { type: Date },
      isActive: { type: Boolean, default: true }
    }],
    
    // Academic & Professional Profile
    googleScholarUrl: { type: String, trim: true },
    researchGateUrl: { type: String, trim: true },
    orcidId: { type: String, trim: true },
    scopusAuthorId: { type: String, trim: true },
    linkedinUrl: { type: String, trim: true },
    personalWebsite: { type: String, trim: true },
    
    // Office Information
    officeRoom: { type: String, trim: true },
    officePhone: { type: String, trim: true },
    officeHours: { type: String, trim: true },
    consultationSlots: [{
      day: {
        type: String,
        enum: ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        required: true
      },
      startTime: { type: String, trim: true }, // e.g., "10:00 AM"
      endTime: { type: String, trim: true },
      location: { type: String, trim: true }
    }],
    
    // Teaching Evaluation
    teachingRatings: [{
      semester: { type: String, required: true, trim: true },
      courseCode: { type: String, required: true, trim: true },
      overallRating: { type: Number, min: 1, max: 5 },
      teachingQuality: { type: Number, min: 1, max: 5 },
      courseContent: { type: Number, min: 1, max: 5 },
      studentEngagement: { type: Number, min: 1, max: 5 },
      feedback: { type: String, trim: true },
      totalResponses: { type: Number, default: 0 }
    }],
    
    averageTeachingRating: { type: Number, min: 0, max: 5, default: 0 },
    
    // Contact Preferences
    preferredContactMethod: {
      type: String,
      enum: ["Email", "Phone", "Office_Visit", "Online_Meeting"],
      default: "Email"
    },
    availableForConsultation: { type: Boolean, default: true },
    acceptsNewStudents: { type: Boolean, default: true },
    
    // System Metadata
    profileCompleteness: { type: Number, default: 0, min: 0, max: 100 },
    lastProfileUpdate: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for years of service
teacherSchema.virtual('yearsOfService').get(function() {
  const joinDate = this.joiningDate;
  const today = new Date();
  return Math.floor((today - joinDate) / (365.25 * 24 * 60 * 60 * 1000));
});

// Virtual for current courses
teacherSchema.virtual('currentCourses').get(function() {
  const currentSemester = this.getCurrentSemester();
  return this.coursesTeaching.filter(course => course.semester === currentSemester);
});

// Method to get current semester
teacherSchema.methods.getCurrentSemester = function() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  
  // Approximate semester detection (Jan-Jun = Spring, Jul-Dec = Fall)
  const semester = month <= 6 ? 'Spring' : 'Fall';
  return `${semester} ${year}`;
};

// Method to calculate profile completeness
teacherSchema.methods.calculateProfileCompleteness = function() {
  let score = 0;
  
  // Basic info (30%)
  if (this.employeeId) score += 10;
  if (this.designation) score += 10;
  if (this.joiningDate) score += 10;
  
  // Qualifications (20%)
  if (this.qualifications && this.qualifications.length > 0) score += 20;
  
  // Research (20%)
  if (this.researchInterests && this.researchInterests.length > 0) score += 5;
  if (this.publications && this.publications.length > 0) score += 10;
  if (this.googleScholarUrl || this.researchGateUrl) score += 5;
  
  // Teaching (15%)
  if (this.coursesTeaching && this.coursesTeaching.length > 0) score += 10;
  if (this.studentsSupervised && this.studentsSupervised.length > 0) score += 5;
  
  // Contact & Office (10%)
  if (this.officeRoom) score += 5;
  if (this.officePhone) score += 5;
  
  // Professional profile (5%)
  if (this.linkedinUrl) score += 3;
  if (this.personalWebsite) score += 2;
  
  return Math.min(score, 100);
};

// Pre-save middleware to update stats and profile completeness
teacherSchema.pre('save', function(next) {
  // Update publication stats
  this.totalPublications = this.publications.length;
  this.totalCitations = this.publications.reduce((sum, pub) => sum + (pub.citationCount || 0), 0);
  
  // Update teaching stats
  this.totalCoursesTaught = this.coursesTeaching.length;
  this.totalStudentsTaught = this.coursesTeaching.reduce((sum, course) => sum + (course.studentCount || 0), 0);
  
  // Update supervision stats
  this.totalThesisSupervised = this.studentsSupervised.length;
  this.ongoingSupervisions = this.studentsSupervised.filter(s => s.status === 'Ongoing').length;
  
  // Update average teaching rating
  if (this.teachingRatings && this.teachingRatings.length > 0) {
    const totalRating = this.teachingRatings.reduce((sum, rating) => sum + (rating.overallRating || 0), 0);
    this.averageTeachingRating = totalRating / this.teachingRatings.length;
  }
  
  // Update profile completeness
  this.profileCompleteness = this.calculateProfileCompleteness();
  this.lastProfileUpdate = new Date();
  
  next();
});

// Indexes for efficient queries
teacherSchema.index({ userId: 1 });
teacherSchema.index({ employeeId: 1 });
teacherSchema.index({ designation: 1 });
teacherSchema.index({ department: 1 });
teacherSchema.index({ isActive: 1 });
teacherSchema.index({ 'clubRoles.role': 1, 'clubRoles.isCurrent': 1 });
teacherSchema.index({ researchArea: 1 });
teacherSchema.index({ profileCompleteness: -1 });
teacherSchema.index({ createdAt: -1 });

const Teacher = mongoose.model("Teacher", teacherSchema);

module.exports = { Teacher };
