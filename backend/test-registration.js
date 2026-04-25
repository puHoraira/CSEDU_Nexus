const axios = require('axios');

const testRegistrationData = {
  // Authentication
  email: 'test.student@example.com',
  password: 'TestPassword123!',
  confirmPassword: 'TestPassword123!',
  
  // Personal Information
  firstName: 'Test',
  lastName: 'Student',
  fullNameBangla: 'টেস্ট স্টুডেন্ট',
  fatherName: 'Test Father',
  motherName: 'Test Mother',
  dateOfBirth: '2000-01-01',
  gender: 'Male',
  bloodGroup: 'A+',
  religion: 'Islam',
  nationality: 'Bangladeshi',
  
  // Contact Information
  phone: '+8801712345678',
  alternativePhone: '+8801812345678',
  emergencyContact: {
    name: 'Emergency Contact',
    relation: 'Father',
    phone: '+8801912345678'
  },
  
  // Address Information
  presentAddress: {
    division: 'Dhaka',
    district: 'Dhaka',
    upazila: 'Dhanmondi',
    union: 'Dhanmondi',
    village: 'Dhanmondi',
    postCode: '1205',
    fullAddress: 'House 123, Road 456, Dhanmondi, Dhaka-1205'
  },
  permanentAddress: {
    division: 'Dhaka',
    district: 'Dhaka',
    upazila: 'Dhanmondi',
    union: 'Dhanmondi',
    village: 'Dhanmondi',
    postCode: '1205',
    fullAddress: 'House 123, Road 456, Dhanmondi, Dhaka-1205',
    sameAsPresent: true
  },
  
  // Social Media
  socialMedia: {
    facebook: 'https://facebook.com/teststudent',
    linkedin: 'https://linkedin.com/in/teststudent',
    github: 'https://github.com/teststudent'
  },
  
  // Profile Information
  bio: 'I am a dedicated computer science student passionate about technology and innovation.',
  personalStatement: 'I believe in using technology to solve real-world problems and make a positive impact on society.',
  hobbies: ['Programming', 'Reading', 'Gaming'],
  interests: ['Artificial Intelligence', 'Web Development', 'Mobile Apps'],
  
  // Skills
  technicalSkills: ['JavaScript', 'Python', 'React', 'Node.js'],
  softSkills: ['Leadership', 'Communication', 'Problem Solving'],
  programmingLanguages: ['JavaScript', 'Python', 'Java', 'C++'],
  frameworks: ['React', 'Express', 'Django', 'Spring Boot'],
  tools: ['Git', 'Docker', 'VS Code', 'Postman'],
  
  // Academic Information
  studentId: '2020-02-999',
  batch: 2020,
  currentYear: 3,
  session: '2020-21',
  admissionYear: 2020,
  academicRecord: {
    currentCgpa: 3.75,
    totalCreditsCompleted: 120
  },
  attendanceRecord: {
    overallAttendancePercentage: 85
  },
  
  // Political Affiliation
  politicalAffiliation: {
    hasAffiliation: false,
    details: ''
  },
  
  // Privacy Settings
  privacySettings: {
    showEmail: false,
    showPhone: false,
    showAddress: false,
    showSocialMedia: true,
    allowDirectMessages: true,
    showInDirectory: true
  }
};

async function testRegistration() {
  try {
    console.log('Testing comprehensive registration...');
    
    const response = await axios.post('http://localhost:5000/api/auth/register', testRegistrationData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Registration successful!');
    console.log('Response:', response.data);
    
    // Test login with the registered user
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: testRegistrationData.email,
      password: testRegistrationData.password
    });
    
    console.log('✅ Login successful!');
    console.log('User data:', loginResponse.data.data.user);
    
    // Test profile retrieval
    const profileResponse = await axios.get('http://localhost:5000/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${loginResponse.data.data.accessToken}`
      }
    });
    
    console.log('✅ Profile retrieval successful!');
    console.log('Profile completeness:', profileResponse.data.data.user.profileCompleteness + '%');
    console.log('Membership info:', profileResponse.data.data.membership);
    
    // Test eligibility check
    const eligibilityResponse = await axios.post('http://localhost:5000/api/auth/check-eligibility/candidacy', {
      requirements: {
        minCgpa: 3.0,
        minAttendance: 75,
        maxDisciplinaryActions: 0
      }
    }, {
      headers: {
        'Authorization': `Bearer ${loginResponse.data.data.accessToken}`
      }
    });
    
    console.log('✅ Eligibility check successful!');
    console.log('EC Candidacy eligible:', eligibilityResponse.data.data.isEligible);
    console.log('Leadership score:', eligibilityResponse.data.data.memberInfo.leadershipScore);
    
  } catch (error) {
    console.error('❌ Test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Run the test
testRegistration();