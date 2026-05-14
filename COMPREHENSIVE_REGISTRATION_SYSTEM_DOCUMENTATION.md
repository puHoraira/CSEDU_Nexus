# Comprehensive Registration System Documentation

## Overview

The CSEDU Nexus registration system collects comprehensive information from students during registration to support all platform features including EC elections, certificates, events, and governance. The system is designed to be flexible, allowing both quick registration and detailed profile completion.

## Registration Approaches

### 1. Quick Registration (Minimum Required)
Students can register with minimal information and complete their profile later:
- **Authentication**: Email, Password
- **Personal**: First Name, Last Name, Phone
- **Academic**: Student ID, Batch, Current Year

### 2. Comprehensive Registration (Recommended)
Students provide complete information during registration for immediate access to all features:
- All quick registration fields
- Academic performance (CGPA, attendance)
- Personal details (DOB, blood group, address)
- Skills and experience
- Leadership and volunteer history
- Achievements and certifications

## Data Categories

### 1. Authentication & Security
- **Email**: Primary login credential (unique, validated)
- **Password**: Minimum 8 characters, hashed with bcrypt
- **Political Affiliation**: Constitutional requirement (Article VI) - students with political party affiliation cannot register

### 2. Personal Information
- **Basic**: First Name, Last Name, Full Name (Bangla), Father's Name, Mother's Name
- **Demographics**: Date of Birth, Gender, Blood Group, Religion, Nationality
- **Contact**: Phone (required), Alternative Phone, Emergency Contact (name, relation, phone)
- **Address**: Present Address (division, district, upazila, union, village, post code, full address)
- **Permanent Address**: Same fields as present address, with "same as present" option

### 3. Academic Information (Critical for EC Eligibility)

#### Required Fields
- **Student ID**: Unique identifier (e.g., "2020-02-045")
- **Batch**: Admission year (e.g., 2020)
- **Current Year**: 1-5 (current academic year)
- **Session**: Auto-calculated or provided (e.g., "2020-21")
- **Admission Year**: Year of admission (defaults to batch)

#### Academic Performance (For EC Candidacy)
- **Current CGPA**: 0.00 - 4.00 (minimum 3.0 required for EC posts)
- **Total Credits Completed**: Number of credits earned
- **Semester Results**: Array of semester-wise performance
  - Semester (e.g., "1-1", "2-2")
  - Year (1-5)
  - GPA (0.00 - 4.00)
  - Credits Completed
  - Courses (optional detailed breakdown)

#### Attendance Record (For Voting Eligibility)
- **Overall Attendance Percentage**: 0-100% (minimum 75% for EC candidacy, 60% for voting)
- **Semester Attendance**: Array of semester-wise attendance
  - Semester
  - Attendance Percentage
  - Total Classes
  - Attended Classes

### 4. Skills & Experience

#### Technical Skills
- **Programming Languages**: Array of languages (e.g., ["Python", "JavaScript", "C++"])
- **Frameworks**: Array of frameworks (e.g., ["React", "Node.js", "Django"])
- **Tools**: Array of tools (e.g., ["Git", "Docker", "VS Code"])
- **Technical Skills**: General technical competencies
- **Soft Skills**: Communication, leadership, teamwork, etc.

#### Professional Experience
- **Work Experience**: Array of work history
  - Company
  - Position
  - Duration
  - Description
  - Is Current Job (boolean)

#### Leadership & Volunteer Experience
- **Leadership Experience**: Array of leadership roles
  - Organization
  - Position
  - Start Date, End Date
  - Description
  - Is Current (boolean)
- **Volunteer Experience**: Array of volunteer work
  - Organization
  - Role
  - Start Date, End Date
  - Description
  - Hours Contributed

### 5. Achievements & Certifications

#### Achievements
- Title
- Description
- Date
- Category: Academic, Professional, Competition, Certification, Other

#### Certifications
- Name
- Issuing Organization
- Issue Date, Expiry Date
- Credential ID
- Credential URL

### 6. Social Media & Online Presence
- Facebook
- LinkedIn
- GitHub
- Twitter
- Instagram
- Personal Website

### 7. Profile & Bio
- **Avatar URL**: Profile picture
- **Bio**: Short description (max 500 characters)
- **Personal Statement**: Detailed statement (max 1000 characters)
- **Hobbies**: Array of hobbies
- **Interests**: Array of interests

### 8. Privacy Settings
- Show Email (boolean)
- Show Phone (boolean)
- Show Address (boolean)
- Show Social Media (boolean)
- Allow Direct Messages (boolean)
- Show in Directory (boolean)

## EC Election Eligibility Criteria

The system automatically calculates eligibility based on collected data:

### For EC Candidacy (Main Posts & Office Bearers)
1. **CGPA**: Minimum 3.0
2. **Attendance**: Minimum 75%
3. **Disciplinary Record**: No active disciplinary actions
4. **Graduation Status**: Not graduating in current year
5. **Membership Status**: Active
6. **Political Affiliation**: No political party affiliation (Article VI)

### For Voting
1. **Attendance**: Minimum 60%
2. **Membership Status**: Active (not suspended, cancelled, or expired)

### Eligibility Tracking
The system maintains:
- **Eligibility Reasons**: Array of criterion checks (CGPA, Attendance, Disciplinary, etc.)
- **Last Eligibility Check**: Timestamp of last calculation
- **Auto-Update**: Eligibility recalculated on member record save

## Member Record Structure

### EC Experience Tracking
- Array of EC positions held
- Term ID, Post ID, Post Name
- Start Date, End Date, Is Current
- Performance Rating (Excellent, Good, Satisfactory, Needs Improvement, Not Rated)
- Achievements, Responsibilities
- Events Organized, Meetings Attended

### Club Participation
- Events Participated, Events Organized
- Volunteer Hours
- Committees Served
- Special Contributions (with impact level)

### Election History
- Array of past election participations
- Election ID, Election Name
- Participation Type (Voter, Candidate, Commission Member, Volunteer)
- Phase (1 or 2)
- Post Applied For
- Candidate Status, Votes Received, Rank
- Has Voted (boolean)

### Disciplinary Record
- Total Actions
- Actions Array (type, reason, date, severity, status)
- Has Active Disciplinary Actions (boolean)

### Financial Record
- Membership Fees Paid
- Outstanding Dues
- Payment History
- Scholarship Status

### Special Designations
- Outstanding Member, Volunteer of the Year, Leadership Award, etc.
- Awarded Date, Awarded By
- Certificate Issued, Certificate Number

## Profile Completeness Calculation

The system calculates profile completeness (0-100%) based on:

### Required Fields (70% weight)
- First Name, Last Name
- Email, Phone
- Date of Birth, Gender
- Present Address
- Bio

### Optional Fields (30% weight)
- Full Name (Bangla)
- Father's Name, Mother's Name
- Blood Group
- Avatar URL
- Social Media (Facebook, LinkedIn)
- Technical Skills
- Personal Statement
- Hobbies, Interests

**Formula**: 
```
completeness = (completedRequired / totalRequired) * 70 + (completedOptional / totalOptional) * 30
```

## API Endpoints

### Registration
```
POST /api/auth/register
Content-Type: application/json

{
  // Minimum required
  "email": "student@du.ac.bd",
  "password": "securepass123",
  "firstName": "Abu",
  "lastName": "Mamun",
  "phone": "+8801712345678",
  "studentId": "2020-02-045",
  "batch": 2020,
  "currentYear": 3,
  "session": "2020-21",
  "admissionYear": 2020,
  
  // Academic performance (for EC eligibility)
  "academicRecord": {
    "currentCgpa": 3.5,
    "totalCreditsCompleted": 120,
    "semesterResults": [...]
  },
  "attendanceRecord": {
    "overallAttendancePercentage": 85,
    "semesterAttendance": [...]
  },
  
  // Optional comprehensive data
  "fullNameBangla": "আবু মামুন",
  "dateOfBirth": "2002-01-15",
  "gender": "Male",
  "bloodGroup": "B+",
  "presentAddress": {...},
  "socialMedia": {...},
  "technicalSkills": ["Python", "JavaScript"],
  "programmingLanguages": ["C++", "Java"],
  "leadershipExperience": [...],
  "achievements": [...],
  "politicalAffiliation": {
    "hasAffiliation": false
  }
}
```

### Profile Update
```
PUT /api/auth/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "Updated Name",
  "bio": "Updated bio",
  "technicalSkills": ["Python", "React"],
  "memberData": {
    "academicRecord": {
      "currentCgpa": 3.6
    },
    "attendanceRecord": {
      "overallAttendancePercentage": 88
    }
  }
}
```

### Check Eligibility
```
GET /api/auth/eligibility/:checkType
Authorization: Bearer <token>

checkType: "voting" | "candidacy" | "ec_post"

Response:
{
  "isEligible": true,
  "reasons": [],
  "memberInfo": {
    "studentId": "2020-02-045",
    "batch": 2020,
    "currentCgpa": 3.5,
    "attendancePercentage": 85,
    "disciplinaryActions": 0,
    "membershipStatus": "Active",
    "leadershipScore": 45
  },
  "requirements": {
    "minCgpa": 3.0,
    "minAttendance": 75,
    "maxDisciplinaryActions": 0
  }
}
```

## Frontend Implementation

### Multi-Step Registration Form

#### Step 1: Account Setup
- Email, Password
- First Name, Last Name
- Phone

#### Step 2: Academic Information
- Student ID, Batch, Current Year
- Session, Admission Year
- Current CGPA
- Overall Attendance Percentage

#### Step 3: Personal Details (Optional)
- Full Name (Bangla)
- Date of Birth, Gender, Blood Group
- Father's Name, Mother's Name
- Address Information

#### Step 4: Skills & Experience (Optional)
- Technical Skills
- Programming Languages, Frameworks, Tools
- Work Experience
- Leadership & Volunteer Experience

#### Step 5: Achievements & Social (Optional)
- Achievements
- Certifications
- Social Media Links
- Privacy Settings

#### Step 6: Review & Submit
- Review all information
- Agree to constitution
- Submit registration

### Progressive Disclosure
- Show required fields first
- Allow "Skip" for optional sections
- Display profile completeness indicator
- Prompt to complete profile after login

## Use Cases

### 1. Quick Student Registration
Student wants to register quickly:
1. Provides email, password, name, phone
2. Provides student ID, batch, year
3. Skips optional sections
4. Registers with ~40% profile completeness
5. Can complete profile later from dashboard

### 2. EC Candidate Registration
Student wants to run for EC:
1. Provides all required information
2. Includes CGPA (≥3.0) and attendance (≥75%)
3. Adds leadership experience
4. Adds achievements
5. Registers with ~80% profile completeness
6. Immediately eligible for EC candidacy

### 3. Profile Completion
Registered student completes profile:
1. Logs in to dashboard
2. Sees "Complete Your Profile" prompt
3. Fills missing academic performance data
4. Adds skills and experience
5. Profile completeness increases
6. Becomes eligible for EC elections

### 4. Eligibility Check
Student checks EC eligibility:
1. Navigates to Elections page
2. System checks eligibility automatically
3. Shows eligibility status with reasons
4. If not eligible, shows what's missing
5. Provides link to update profile

## Constitutional Compliance

### Article VI: Membership Eligibility
- System checks political affiliation during registration
- Rejects registration if `politicalAffiliation.hasAffiliation === true`
- Stores affiliation status for audit purposes

### Article XIV: Election Eligibility
- CGPA requirement enforced
- Attendance requirement enforced
- Disciplinary record checked
- Graduation status verified

### Article XIX: Certificate Eligibility
- EC experience tracked
- Volunteer hours recorded
- Leadership roles documented
- Used for certificate generation

## Data Validation

### Backend Validation (Zod)
- Type checking
- Range validation (CGPA 0-4.0, Attendance 0-100%)
- String length limits
- Email format validation
- Required field enforcement

### Frontend Validation
- Real-time field validation
- CGPA format (X.XX)
- Phone number format
- Email format
- Student ID format
- Date validation

## Security & Privacy

### Data Protection
- Passwords hashed with bcrypt (12 rounds)
- Sensitive data encrypted at rest
- HTTPS required for all API calls
- JWT tokens for authentication

### Privacy Controls
- User-controlled visibility settings
- Opt-in for directory listing
- Granular permission controls
- Data export capability

### Audit Trail
- All registrations logged
- Profile updates tracked
- Eligibility checks recorded
- Constitutional compliance verified

## Future Enhancements

### Planned Features
1. **Document Upload**: Student ID card, transcripts
2. **Email Verification**: Verify university email
3. **Bulk Import**: Import student data from CSV
4. **Profile Verification**: Admin approval workflow
5. **Data Validation**: Cross-check with university records
6. **Profile Suggestions**: AI-powered profile completion suggestions
7. **Skill Endorsements**: Peer endorsements for skills
8. **Achievement Verification**: Verify achievements with certificates

### Integration Points
- University student database
- Academic records system
- Attendance tracking system
- Certificate generation system
- Election management system
- Event registration system

## Best Practices

### For Students
1. Provide accurate information
2. Keep CGPA and attendance updated
3. Complete profile for better opportunities
4. Update EC experience after each term
5. Maintain privacy settings

### For Administrators
1. Verify student information
2. Monitor profile completeness
3. Audit eligibility calculations
4. Review disciplinary records
5. Ensure constitutional compliance

### For Developers
1. Validate all inputs
2. Handle optional fields gracefully
3. Calculate eligibility consistently
4. Log all critical operations
5. Maintain backward compatibility

## Troubleshooting

### Common Issues

#### Registration Fails
- **Email exists**: User already registered
- **Student ID exists**: ID already in use
- **Political affiliation**: Cannot register with party affiliation
- **Invalid data**: Check validation errors

#### Eligibility Issues
- **Low CGPA**: Update academic record
- **Low attendance**: Update attendance record
- **Disciplinary actions**: Contact administrator
- **Inactive membership**: Renew membership

#### Profile Completeness
- **Low percentage**: Fill optional fields
- **Missing required fields**: Complete basic information
- **Calculation error**: Contact support

## Support & Resources

### Documentation
- API Documentation: `/docs/api`
- User Guide: `/docs/user-guide`
- Admin Guide: `/docs/admin-guide`

### Contact
- Technical Support: support@csedusc.org
- Membership Queries: membership@csedusc.org
- Election Queries: election@csedusc.org

---

**Last Updated**: 2024
**Version**: 1.0.0
**Maintained By**: CSEDU Nexus Development Team
