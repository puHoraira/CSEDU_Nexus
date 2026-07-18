/**
 * Comprehensive Workshop & Event Seeding Script
 * Creates workshops and events with complete functionality:
 * - Registrations with seat assignments
 * - Session tracking
 * - Assignments and prework
 * - Attendance records
 * - Certificate generation
 * - Proper status workflows
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { User } = require('../src/models/User');
const { Member } = require('../src/models/Member');
const { Event } = require('../src/models/Event');
const { Workshop } = require('../src/models/Workshop');
const { EventRegistration } = require('../src/models/EventRegistration');
const { WorkshopRegistration } = require('../src/models/WorkshopRegistration');
const { Room } = require('../src/models/Room');
const crypto = require('crypto');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/iplab';

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// Helper to get random items from array
function getRandomItems(arr, count) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, arr.length));
}

// Helper to get random item
function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Helper to generate past/future dates
function getDateOffset(daysOffset) {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date;
}

async function seedWorkshopsAndEvents() {
  console.log('\n🌱 Starting Workshop & Event Seeding...\n');

  // Get users and members
  const users = await User.find({ role: 'Student' }).limit(200);
  const members = await Member.find().limit(150);
  const adminUser = await User.findOne({ role: 'Admin' });
  const moderatorUser = await User.findOne({ role: 'Moderator' });
  const rooms = await Room.find();

  if (users.length < 10) {
    console.log(`⚠️  Not enough users found. Found ${users.length}, need at least 10.`);
    console.log('Please run: node scripts/create-test-users.js');
    return;
  }

  console.log(`Found ${users.length} users, ${members.length} members, ${rooms.length} rooms`);

  const creatorUser = adminUser || moderatorUser || users[0];

  // ==================== WORKSHOPS ====================
  console.log('\n📚 Creating Workshops...');

  const workshops = [];
  
  // Workshop 1: Completed Web Development Workshop
  const workshop1 = new Workshop({
    title: 'Full-Stack Web Development Bootcamp',
    description: `Comprehensive workshop covering modern web development from basics to deployment.
    
Learn to build production-ready web applications using React, Node.js, and MongoDB. This hands-on workshop includes practical projects, code reviews, and deployment strategies.

Topics covered:
- Frontend development with React and modern JavaScript
- Backend APIs with Node.js and Express
- Database design with MongoDB
- Authentication and Authorization
- Deployment and DevOps basics
- Best practices and code quality`,
    shortDescription: 'Learn full-stack web development with React, Node.js, and MongoDB',
    coverImage: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085',
    startDate: getDateOffset(-30),
    endDate: getDateOffset(-25),
    venue: 'Computer Lab 1, Engineering Building',
    isOnline: false,
    category: 'Technical',
    tags: ['Web Development', 'React', 'Node.js', 'MongoDB', 'Full-Stack'],
    level: 'Intermediate',
    capacity: 50,
    registrationDeadline: getDateOffset(-35),
    requiresApproval: true,
    isFree: false,
    fee: 500,
    currency: 'BDT',
    speakers: [
      {
        name: 'Dr. Ayesha Rahman',
        designation: 'Senior Software Engineer',
        organization: 'Google',
        bio: '10+ years of experience in web development and cloud architecture',
        avatarUrl: 'https://i.pravatar.cc/150?img=5'
      },
      {
        name: 'Md. Karim Hassan',
        designation: 'Lead Developer',
        organization: 'Pathao',
        bio: 'Expert in React and modern JavaScript frameworks',
        avatarUrl: 'https://i.pravatar.cc/150?img=12'
      }
    ],
    materials: [
      {
        title: 'React Basics - Lecture Slides',
        url: 'https://example.com/materials/react-basics.pdf',
        type: 'slides',
        description: 'Introduction to React components and hooks'
      },
      {
        title: 'Node.js API Development Guide',
        url: 'https://example.com/materials/nodejs-api.pdf',
        type: 'pdf',
        description: 'Complete guide to building RESTful APIs'
      },
      {
        title: 'Project Starter Code',
        url: 'https://github.com/example/workshop-starter',
        type: 'code',
        description: 'Boilerplate code for the final project'
      }
    ],
    prerequisites: ['Basic JavaScript knowledge', 'HTML/CSS fundamentals', 'Git basics'],
    learningOutcomes: [
      'Build full-stack web applications from scratch',
      'Implement user authentication and authorization',
      'Deploy applications to production',
      'Follow industry best practices'
    ],
    sessions: [
      {
        title: 'Day 1: Frontend Fundamentals',
        description: 'Introduction to React, components, and state management',
        startTime: getDateOffset(-30),
        endTime: new Date(getDateOffset(-30).getTime() + 4 * 60 * 60 * 1000),
        location: 'Computer Lab 1',
        isOnline: false,
        speaker: 'Md. Karim Hassan',
        order: 1
      },
      {
        title: 'Day 2: Backend Development',
        description: 'Building RESTful APIs with Node.js and Express',
        startTime: getDateOffset(-29),
        endTime: new Date(getDateOffset(-29).getTime() + 4 * 60 * 60 * 1000),
        location: 'Computer Lab 1',
        isOnline: false,
        speaker: 'Dr. Ayesha Rahman',
        order: 2
      },
      {
        title: 'Day 3: Database Integration',
        description: 'MongoDB basics and database design',
        startTime: getDateOffset(-28),
        endTime: new Date(getDateOffset(-28).getTime() + 4 * 60 * 60 * 1000),
        location: 'Computer Lab 1',
        isOnline: false,
        speaker: 'Dr. Ayesha Rahman',
        order: 3
      },
      {
        title: 'Day 4: Authentication & Security',
        description: 'Implementing JWT authentication and security best practices',
        startTime: getDateOffset(-27),
        endTime: new Date(getDateOffset(-27).getTime() + 4 * 60 * 60 * 1000),
        location: 'Computer Lab 1',
        isOnline: false,
        speaker: 'Dr. Ayesha Rahman',
        order: 4
      },
      {
        title: 'Day 5: Deployment & Best Practices',
        description: 'Deploy to production and learn DevOps basics',
        startTime: getDateOffset(-26),
        endTime: new Date(getDateOffset(-26).getTime() + 4 * 60 * 60 * 1000),
        location: 'Computer Lab 1',
        isOnline: false,
        speaker: 'Md. Karim Hassan',
        order: 5
      }
    ],
    prework: [
      {
        title: 'Install Node.js and npm',
        description: 'Download and install Node.js LTS version from nodejs.org',
        url: 'https://nodejs.org/',
        required: true,
        order: 1
      },
      {
        title: 'Setup Git and GitHub',
        description: 'Create a GitHub account and install Git on your machine',
        url: 'https://github.com/',
        required: true,
        order: 2
      },
      {
        title: 'Install VS Code',
        description: 'Download and install Visual Studio Code',
        url: 'https://code.visualstudio.com/',
        required: true,
        order: 3
      },
      {
        title: 'Complete JavaScript Refresher',
        description: 'Review modern JavaScript ES6+ features',
        url: 'https://javascript.info/',
        required: false,
        order: 4
      }
    ],
    assignments: [
      {
        title: 'Assignment 1: Build a React Component Library',
        description: 'Create reusable React components with props and state management',
        dueDate: getDateOffset(-27),
        maxPoints: 100,
        allowFile: true,
        allowLink: true,
        order: 1
      },
      {
        title: 'Assignment 2: Create a RESTful API',
        description: 'Build a complete CRUD API with Express and MongoDB',
        dueDate: getDateOffset(-25),
        maxPoints: 100,
        allowFile: true,
        allowLink: true,
        order: 2
      },
      {
        title: 'Final Project: Full-Stack Application',
        description: 'Build a complete web application with authentication',
        dueDate: getDateOffset(-24),
        maxPoints: 200,
        allowFile: true,
        allowLink: true,
        order: 3
      }
    ],
    completion: {
      minAttendancePercentage: 80,
      requireAllAssignments: true,
      certificateEnabled: true,
      certificateTitle: 'Certificate of Completion - Full-Stack Web Development',
      signatoryName: 'Dr. Ayesha Rahman',
      signatoryTitle: 'Workshop Lead Instructor'
    },
    feedbackEnabled: true,
    targetAudience: {
      allowedYears: [2, 3, 4],
      allowedBatches: [],
      allowedRoles: [],
      invitedUsers: [],
      programType: 'all'
    },
    status: 'Completed',
    createdBy: creatorUser._id,
    stats: {
      totalRegistrations: 0,
      totalAttendees: 0,
      totalApproved: 0,
      totalCompleted: 0,
      totalCertificates: 0
    }
  });

  if (rooms.length > 0) {
    workshop1.roomAssignment = {
      enabled: true,
      rooms: [{ roomId: rooms[0]._id, priority: 1 }],
      autoAssignSeats: true,
      totalSeatsAvailable: rooms[0].capacity || 50,
      totalSeatsOccupied: 0
    };
  }

  await workshop1.save();
  workshops.push(workshop1);
  console.log(`✅ Created workshop: ${workshop1.title}`);

  // Workshop 2: Ongoing Machine Learning Workshop
  const workshop2 = new Workshop({
    title: 'Introduction to Machine Learning with Python',
    description: `Hands-on workshop covering fundamental ML concepts and practical implementation.

Learn machine learning from scratch with Python and scikit-learn. Build and deploy your first ML models with real-world datasets.

What you'll learn:
- Python for data science
- ML algorithms and concepts
- Model training and evaluation
- Feature engineering
- Model deployment basics`,
    shortDescription: 'Learn ML fundamentals with Python and scikit-learn',
    coverImage: 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb',
    startDate: getDateOffset(-3),
    endDate: getDateOffset(4),
    venue: 'Lab 302, CSE Building',
    isOnline: false,
    category: 'Technical',
    tags: ['Machine Learning', 'Python', 'Data Science', 'AI'],
    level: 'Beginner',
    capacity: 40,
    registrationDeadline: getDateOffset(-7),
    requiresApproval: true,
    isFree: false,
    fee: 700,
    speakers: [
      {
        name: 'Prof. Dr. Tanvir Ahmed',
        designation: 'Professor of Computer Science',
        organization: 'BUET',
        bio: 'ML researcher with 15+ years of experience',
        avatarUrl: 'https://i.pravatar.cc/150?img=33'
      }
    ],
    materials: [
      {
        title: 'ML Fundamentals Slides',
        url: 'https://example.com/materials/ml-basics.pdf',
        type: 'slides',
        description: 'Core concepts and algorithms'
      },
      {
        title: 'Python ML Libraries Guide',
        url: 'https://example.com/materials/python-ml.pdf',
        type: 'pdf'
      }
    ],
    prerequisites: ['Basic Python programming', 'Statistics basics'],
    learningOutcomes: [
      'Understand ML algorithms',
      'Build and train models',
      'Evaluate model performance',
      'Deploy ML models'
    ],
    sessions: [
      {
        title: 'Session 1: ML Fundamentals',
        description: 'Introduction to machine learning concepts',
        startTime: getDateOffset(-3),
        endTime: new Date(getDateOffset(-3).getTime() + 3 * 60 * 60 * 1000),
        location: 'Lab 302',
        speaker: 'Prof. Dr. Tanvir Ahmed',
        order: 1
      },
      {
        title: 'Session 2: Supervised Learning',
        description: 'Classification and regression algorithms',
        startTime: getDateOffset(-1),
        endTime: new Date(getDateOffset(-1).getTime() + 3 * 60 * 60 * 1000),
        location: 'Lab 302',
        speaker: 'Prof. Dr. Tanvir Ahmed',
        order: 2
      },
      {
        title: 'Session 3: Model Evaluation',
        description: 'Training, testing, and validation techniques',
        startTime: getDateOffset(1),
        endTime: new Date(getDateOffset(1).getTime() + 3 * 60 * 60 * 1000),
        location: 'Lab 302',
        speaker: 'Prof. Dr. Tanvir Ahmed',
        order: 3
      },
      {
        title: 'Session 4: Final Project',
        description: 'Build your own ML model',
        startTime: getDateOffset(3),
        endTime: new Date(getDateOffset(3).getTime() + 3 * 60 * 60 * 1000),
        location: 'Lab 302',
        speaker: 'Prof. Dr. Tanvir Ahmed',
        order: 4
      }
    ],
    prework: [
      {
        title: 'Install Python 3.8+',
        description: 'Download Python from python.org',
        url: 'https://python.org/',
        required: true,
        order: 1
      },
      {
        title: 'Install Jupyter Notebook',
        description: 'Setup Jupyter for interactive coding',
        required: true,
        order: 2
      }
    ],
    assignments: [
      {
        title: 'Build a Classification Model',
        description: 'Create a binary classification model',
        dueDate: getDateOffset(2),
        maxPoints: 100,
        order: 1
      },
      {
        title: 'Final ML Project',
        description: 'Complete ML project with real dataset',
        dueDate: getDateOffset(5),
        maxPoints: 150,
        order: 2
      }
    ],
    completion: {
      minAttendancePercentage: 75,
      requireAllAssignments: false,
      certificateEnabled: true,
      certificateTitle: 'Certificate of Completion - Machine Learning',
      signatoryName: 'Prof. Dr. Tanvir Ahmed',
      signatoryTitle: 'Workshop Instructor'
    },
    targetAudience: { allowedYears: [3, 4, 5], programType: 'all' },
    status: 'Ongoing',
    createdBy: creatorUser._id
  });

  if (rooms.length > 1) {
    workshop2.roomAssignment = {
      enabled: true,
      rooms: [{ roomId: rooms[1]._id, priority: 1 }],
      autoAssignSeats: true,
      totalSeatsAvailable: rooms[1].capacity || 40
    };
  }

  await workshop2.save();
  workshops.push(workshop2);
  console.log(`✅ Created workshop: ${workshop2.title}`);

  // Workshop 3: Upcoming Cyber Security Workshop
  const workshop3 = new Workshop({
    title: 'Cybersecurity Essentials for Developers',
    description: `Learn to build secure applications and protect against common vulnerabilities.

This workshop covers essential security concepts every developer should know, from secure coding practices to penetration testing basics.`,
    shortDescription: 'Essential cybersecurity skills for developers',
    coverImage: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b',
    startDate: getDateOffset(10),
    endDate: getDateOffset(13),
    venue: 'Auditorium, Main Building',
    isOnline: false,
    category: 'Technical',
    tags: ['Cybersecurity', 'Security', 'Ethical Hacking'],
    level: 'Intermediate',
    capacity: 60,
    registrationDeadline: getDateOffset(5),
    requiresApproval: true,
    isFree: false,
    fee: 800,
    speakers: [
      {
        name: 'Fahim Shahriar',
        designation: 'Security Consultant',
        organization: 'CyberSec BD',
        bio: 'Certified Ethical Hacker with 8 years experience',
        avatarUrl: 'https://i.pravatar.cc/150?img=52'
      }
    ],
    materials: [],
    prerequisites: ['Basic programming', 'Networking fundamentals'],
    learningOutcomes: [
      'Identify security vulnerabilities',
      'Implement secure coding practices',
      'Perform basic penetration testing',
      'Understand OWASP Top 10'
    ],
    sessions: [
      {
        title: 'Day 1: Security Fundamentals',
        startTime: getDateOffset(10),
        endTime: new Date(getDateOffset(10).getTime() + 4 * 60 * 60 * 1000),
        location: 'Auditorium',
        speaker: 'Fahim Shahriar',
        order: 1
      },
      {
        title: 'Day 2: Web Application Security',
        startTime: getDateOffset(11),
        endTime: new Date(getDateOffset(11).getTime() + 4 * 60 * 60 * 1000),
        location: 'Auditorium',
        speaker: 'Fahim Shahriar',
        order: 2
      },
      {
        title: 'Day 3: Penetration Testing Basics',
        startTime: getDateOffset(12),
        endTime: new Date(getDateOffset(12).getTime() + 4 * 60 * 60 * 1000),
        location: 'Auditorium',
        speaker: 'Fahim Shahriar',
        order: 3
      }
    ],
    prework: [
      {
        title: 'Setup Kali Linux VM',
        description: 'Install VirtualBox and Kali Linux',
        required: true,
        order: 1
      }
    ],
    assignments: [],
    completion: {
      minAttendancePercentage: 80,
      certificateEnabled: true,
      certificateTitle: 'Certificate of Participation - Cybersecurity Essentials'
    },
    targetAudience: { allowedYears: [2, 3, 4], programType: 'all' },
    status: 'Registration_Open',
    createdBy: creatorUser._id
  });

  await workshop3.save();
  workshops.push(workshop3);
  console.log(`✅ Created workshop: ${workshop3.title}`);

  // ==================== EVENTS ====================
  console.log('\n🎉 Creating Events...');

  const events = [];

  // Event 1: Completed Tech Talk
  const event1 = new Event({
    title: 'Tech Talk: Future of AI in Bangladesh',
    description: `Join us for an inspiring tech talk about the future of Artificial Intelligence in Bangladesh.

Our distinguished speakers will discuss:
- Current AI landscape in Bangladesh
- Opportunities in AI research and industry
- Career paths in AI/ML
- Ethical considerations

Open Q&A session at the end.`,
    shortDescription: 'Exploring AI opportunities and future in Bangladesh',
    targetYears: ['All_Years'],
    eventDate: getDateOffset(-45),
    venue: 'Seminar Hall, CSE Building',
    venueDetails: {
      building: 'CSE Building',
      room: 'Seminar Hall',
      floor: '3rd Floor',
      directions: 'Take the main stairs to 3rd floor, first room on the right'
    },
    category: 'Seminar',
    tags: ['AI', 'Technology', 'Career', 'Seminar'],
    coverImage: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e',
    images: [],
    registrationRequired: true,
    registrationSettings: {
      openDate: getDateOffset(-60),
      closeDate: getDateOffset(-46),
      maxParticipants: 100,
      requiresApproval: false,
      allowWaitlist: true
    },
    attendanceTracking: {
      enabled: true,
      qrCode: 'EVENT-AI-TALK-2024',
      checkInStartTime: getDateOffset(-45),
      checkInEndTime: new Date(getDateOffset(-45).getTime() + 3 * 60 * 60 * 1000),
      totalCheckIns: 0
    },
    status: 'Completed',
    visibility: 'Public',
    isFeatured: true,
    isPublished: true,
    organizers: [
      {
        userId: creatorUser._id,
        role: 'Event Coordinator',
        responsibilities: 'Overall event management'
      }
    ],
    contactPerson: {
      name: creatorUser.name,
      email: creatorUser.email,
      phone: '+880 1712-345678'
    },
    speakers: [
      {
        name: 'Dr. Mohammad Kaykobad',
        designation: 'Professor',
        organization: 'BUET',
        bio: 'Renowned computer scientist and AI researcher',
        photoUrl: 'https://i.pravatar.cc/150?img=68'
      },
      {
        name: 'Sadia Khandaker',
        designation: 'ML Engineer',
        organization: 'Brain Station 23',
        bio: 'Expert in NLP and computer vision',
        photoUrl: 'https://i.pravatar.cc/150?img=45'
      }
    ],
    schedule: [
      {
        title: 'Registration & Networking',
        description: 'Check-in and refreshments',
        startTime: getDateOffset(-45),
        endTime: new Date(getDateOffset(-45).getTime() + 30 * 60 * 1000),
        venue: 'Seminar Hall Lobby'
      },
      {
        title: 'Welcome Address',
        description: 'Opening remarks by club president',
        startTime: new Date(getDateOffset(-45).getTime() + 30 * 60 * 1000),
        endTime: new Date(getDateOffset(-45).getTime() + 45 * 60 * 1000),
        venue: 'Seminar Hall'
      },
      {
        title: 'Keynote: AI Landscape in Bangladesh',
        description: 'Dr. Mohammad Kaykobad',
        startTime: new Date(getDateOffset(-45).getTime() + 45 * 60 * 1000),
        endTime: new Date(getDateOffset(-45).getTime() + 105 * 60 * 1000),
        venue: 'Seminar Hall',
        speaker: 'Dr. Mohammad Kaykobad'
      },
      {
        title: 'Industry Perspective on AI',
        description: 'Sadia Khandaker',
        startTime: new Date(getDateOffset(-45).getTime() + 105 * 60 * 1000),
        endTime: new Date(getDateOffset(-45).getTime() + 165 * 60 * 1000),
        venue: 'Seminar Hall',
        speaker: 'Sadia Khandaker'
      },
      {
        title: 'Q&A Session',
        description: 'Interactive discussion with speakers',
        startTime: new Date(getDateOffset(-45).getTime() + 165 * 60 * 1000),
        endTime: new Date(getDateOffset(-45).getTime() + 195 * 60 * 1000),
        venue: 'Seminar Hall'
      }
    ],
    stats: {
      totalRegistrations: 0,
      totalAttendees: 0,
      totalPosts: 0,
      totalComments: 0
    },
    createdBy: creatorUser._id,
    publishedAt: getDateOffset(-60)
  });

  if (rooms.length > 0) {
    event1.roomAssignment = {
      enabled: true,
      rooms: [{ roomId: rooms[0]._id, priority: 1 }],
      autoAssignSeats: false,
      totalSeatsAvailable: 100,
      totalSeatsOccupied: 0
    };
  }

  await event1.save();
  events.push(event1);
  console.log(`✅ Created event: ${event1.title}`);

  // Event 2: Ongoing Hackathon
  const event2 = new Event({
    title: 'Innovation Hackathon 2024',
    description: `48-hour coding marathon to build innovative solutions for real-world problems.

Form teams of 3-5 members and compete for exciting prizes. Mentors available throughout the event.

Prize Pool: 50,000 BDT
- 1st Prize: 25,000 BDT
- 2nd Prize: 15,000 BDT
- 3rd Prize: 10,000 BDT

Problem Statements:
1. Healthcare accessibility
2. Education technology
3. Environmental sustainability
4. Financial inclusion`,
    shortDescription: '48-hour hackathon with 50K prize pool',
    targetYears: ['All_Years'],
    eventDate: getDateOffset(-1),
    endDate: getDateOffset(1),
    venue: 'Computer Lab Complex',
    venueDetails: {
      building: 'Engineering Building',
      room: 'Labs 1-4',
      floor: 'Ground Floor'
    },
    category: 'Competition',
    tags: ['Hackathon', 'Coding', 'Competition', 'Innovation'],
    coverImage: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d',
    registrationRequired: true,
    registrationSettings: {
      openDate: getDateOffset(-30),
      closeDate: getDateOffset(-2),
      maxParticipants: 150,
      requiresApproval: true,
      registrationFee: 200,
      allowWaitlist: false
    },
    attendanceTracking: {
      enabled: true,
      totalCheckIns: 0
    },
    budget: 80000,
    actualExpense: 0,
    revenue: 0,
    status: 'Ongoing',
    visibility: 'Public',
    isFeatured: true,
    organizers: [
      { userId: creatorUser._id, role: 'Event Lead' }
    ],
    contactPerson: {
      name: creatorUser.name,
      email: creatorUser.email
    },
    speakers: [
      {
        name: 'Amit Saha',
        designation: 'CTO',
        organization: 'Tech Startup Inc',
        bio: 'Serial entrepreneur and tech mentor',
        photoUrl: 'https://i.pravatar.cc/150?img=14'
      }
    ],
    schedule: [
      {
        title: 'Opening Ceremony',
        startTime: getDateOffset(-1),
        endTime: new Date(getDateOffset(-1).getTime() + 60 * 60 * 1000),
        venue: 'Auditorium'
      },
      {
        title: 'Hacking Begins',
        startTime: new Date(getDateOffset(-1).getTime() + 60 * 60 * 1000),
        endTime: getDateOffset(1),
        venue: 'Computer Labs'
      },
      {
        title: 'Final Presentations',
        startTime: getDateOffset(1),
        endTime: new Date(getDateOffset(1).getTime() + 4 * 60 * 60 * 1000),
        venue: 'Auditorium'
      },
      {
        title: 'Prize Distribution',
        startTime: new Date(getDateOffset(1).getTime() + 4 * 60 * 60 * 1000),
        endTime: new Date(getDateOffset(1).getTime() + 5 * 60 * 60 * 1000),
        venue: 'Auditorium'
      }
    ],
    requirements: ['Laptop', 'Student ID', 'Team formation (3-5 members)'],
    whatToBring: ['Laptop with charger', 'Student ID card', 'Sleeping bag (optional)'],
    stats: { totalRegistrations: 0, totalAttendees: 0 },
    createdBy: creatorUser._id,
    publishedAt: getDateOffset(-30)
  });

  await event2.save();
  events.push(event2);
  console.log(`✅ Created event: ${event2.title}`);

  // Event 3: Upcoming Cultural Event
  const event3 = new Event({
    title: 'Tech & Culture Fest 2024',
    description: `Annual cultural celebration combining technology and creativity.

Enjoy performances, exhibitions, food stalls, and tech demos. Open to all students and faculty.

Highlights:
- Live music performances
- Tech project exhibitions
- Cultural performances
- Food festival
- Gaming zone
- Photography competition`,
    shortDescription: 'Annual tech and cultural celebration',
    targetYears: ['All_Years'],
    eventDate: getDateOffset(20),
    endDate: getDateOffset(22),
    venue: 'University Ground',
    category: 'Cultural',
    tags: ['Festival', 'Cultural', 'Entertainment', 'Tech Exhibition'],
    coverImage: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30',
    registrationRequired: false,
    status: 'Registration_Open',
    visibility: 'Public',
    isFeatured: true,
    organizers: [
      { userId: creatorUser._id, role: 'Festival Coordinator' }
    ],
    contactPerson: {
      name: creatorUser.name,
      email: creatorUser.email
    },
    schedule: [
      {
        title: 'Day 1: Opening & Tech Exhibition',
        startTime: getDateOffset(20),
        endTime: new Date(getDateOffset(20).getTime() + 8 * 60 * 60 * 1000),
        venue: 'University Ground'
      },
      {
        title: 'Day 2: Cultural Performances',
        startTime: getDateOffset(21),
        endTime: new Date(getDateOffset(21).getTime() + 8 * 60 * 60 * 1000),
        venue: 'University Ground'
      },
      {
        title: 'Day 3: Grand Finale',
        startTime: getDateOffset(22),
        endTime: new Date(getDateOffset(22).getTime() + 8 * 60 * 60 * 1000),
        venue: 'University Ground'
      }
    ],
    budget: 200000,
    stats: { totalRegistrations: 0, totalAttendees: 0 },
    createdBy: creatorUser._id,
    publishedAt: getDateOffset(-10)
  });

  await event3.save();
  events.push(event3);
  console.log(`✅ Created event: ${event3.title}`);

  // Event 4: Upcoming Career Fair
  const event4 = new Event({
    title: 'Tech Career Fair 2024',
    description: `Connect with top tech companies and explore career opportunities.

20+ companies participating including multinational corporations and leading startups.

What to expect:
- Company booths and presentations
- On-spot interviews
- Resume review sessions
- Career counseling
- Networking opportunities`,
    shortDescription: 'Career fair with 20+ tech companies',
    targetYears: ['Third_Year', 'Fourth_Year', 'Masters'],
    eventDate: getDateOffset(30),
    venue: 'Main Auditorium Complex',
    category: 'Networking',
    tags: ['Career', 'Job Fair', 'Recruitment', 'Networking'],
    coverImage: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87',
    registrationRequired: true,
    registrationSettings: {
      openDate: getDateOffset(5),
      closeDate: getDateOffset(28),
      maxParticipants: 500,
      requiresApproval: false
    },
    status: 'Planned',
    visibility: 'Public',
    isFeatured: true,
    organizers: [{ userId: creatorUser._id, role: 'Career Fair Organizer' }],
    requirements: ['Professional attire', 'Updated resume (5 copies)', 'Student ID'],
    whatToBring: ['Resume copies', 'Portfolio (if applicable)', 'Notepad'],
    stats: { totalRegistrations: 0 },
    createdBy: creatorUser._id
  });

  await event4.save();
  events.push(event4);
  console.log(`✅ Created event: ${event4.title}`);

  // ==================== WORKSHOP REGISTRATIONS ====================
  console.log('\n👥 Creating Workshop Registrations...');

  // Workshop 1 (Completed) - Create registrations with full completion
  const workshop1Participants = getRandomItems(users, 35);
  let workshop1Registrations = [];

  for (let i = 0; i < workshop1Participants.length; i++) {
    const user = workshop1Participants[i];
    const registration = new WorkshopRegistration({
      workshopId: workshop1._id,
      userId: user._id,
      participantName: user.name,
      participantEmail: user.email,
      participantPhone: user.phone || `+880 17${Math.floor(10000000 + Math.random() * 90000000)}`,
      status: 'Attended',
      paymentRequired: true,
      paymentStatus: 'Paid',
      paymentAmount: 500,
      transactionId: `TXN-${Date.now()}-${i}`,
      paymentGateway: 'bKash',
      paidAt: getDateOffset(-35),
      checkedIn: true,
      checkedInAt: getDateOffset(-30),
      
      // Session attendance (attended all 5 sessions)
      sessionAttendance: workshop1.sessions.map(session => ({
        sessionId: session._id,
        attended: Math.random() > 0.1, // 90% attended each session
        markedAt: session.startTime
      })),
      
      // Prework completed
      preworkCompleted: workshop1.prework.slice(0, 3).map(pw => pw._id),
      
      // Completion tracking
      completionPercentage: 85 + Math.floor(Math.random() * 15),
      isCompleted: i < 30, // 30 out of 35 completed
      completedAt: i < 30 ? getDateOffset(-24) : null,
      certificateIssued: i < 30,
      
      reminderSent: true
    });

    // Seat assignment if rooms available
    if (rooms.length > 0 && workshop1.roomAssignment.enabled) {
      registration.seatAssignment = {
        roomId: rooms[0]._id,
        seatNumber: `A${i + 1}`,
        row: Math.floor(i / 10) + 1,
        position: (i % 10) + 1,
        assignedAt: getDateOffset(-32),
        autoAssigned: true
      };
    }

    registration.qrToken = registration.generateQRToken();
    await registration.save();
    workshop1Registrations.push(registration);
  }

  // Update workshop1 stats
  workshop1.stats = {
    totalRegistrations: workshop1Registrations.length,
    totalAttendees: workshop1Registrations.filter(r => r.checkedIn).length,
    totalApproved: workshop1Registrations.length,
    totalCompleted: workshop1Registrations.filter(r => r.isCompleted).length,
    totalCertificates: workshop1Registrations.filter(r => r.certificateIssued).length
  };
  if (workshop1.roomAssignment.enabled) {
    workshop1.roomAssignment.totalSeatsOccupied = workshop1Registrations.length;
  }
  await workshop1.save();

  console.log(`✅ Created ${workshop1Registrations.length} registrations for ${workshop1.title}`);
  console.log(`   - ${workshop1.stats.totalCompleted} completed, ${workshop1.stats.totalCertificates} certificates issued`);

  // Workshop 2 (Ongoing) - Registrations with partial completion
  const workshop2Participants = getRandomItems(users, 28);
  let workshop2Registrations = [];

  for (let i = 0; i < workshop2Participants.length; i++) {
    const user = workshop2Participants[i];
    const registration = new WorkshopRegistration({
      workshopId: workshop2._id,
      userId: user._id,
      participantName: user.name,
      participantEmail: user.email,
      participantPhone: user.phone || `+880 17${Math.floor(10000000 + Math.random() * 90000000)}`,
      status: 'Approved',
      paymentRequired: true,
      paymentStatus: 'Paid',
      paymentAmount: 700,
      transactionId: `TXN-ML-${Date.now()}-${i}`,
      paymentGateway: 'bKash',
      paidAt: getDateOffset(-10),
      checkedIn: i < 25, // 25 checked in so far
      checkedInAt: i < 25 ? getDateOffset(-3) : null,
      
      // Session attendance (first 2 sessions completed)
      sessionAttendance: workshop2.sessions.slice(0, 2).map(session => ({
        sessionId: session._id,
        attended: i < 25 && Math.random() > 0.15,
        markedAt: session.startTime
      })),
      
      preworkCompleted: workshop2.prework.map(pw => pw._id),
      
      completionPercentage: i < 25 ? 40 + Math.floor(Math.random() * 20) : 0,
      isCompleted: false,
      certificateIssued: false,
      
      reminderSent: true
    });

    if (rooms.length > 1 && workshop2.roomAssignment.enabled) {
      registration.seatAssignment = {
        roomId: rooms[1]._id,
        seatNumber: `B${i + 1}`,
        row: Math.floor(i / 8) + 1,
        position: (i % 8) + 1,
        assignedAt: getDateOffset(-5),
        autoAssigned: true
      };
    }

    registration.qrToken = registration.generateQRToken();
    await registration.save();
    workshop2Registrations.push(registration);
  }

  workshop2.stats = {
    totalRegistrations: workshop2Registrations.length,
    totalAttendees: workshop2Registrations.filter(r => r.checkedIn).length,
    totalApproved: workshop2Registrations.length,
    totalCompleted: 0,
    totalCertificates: 0
  };
  if (workshop2.roomAssignment.enabled) {
    workshop2.roomAssignment.totalSeatsOccupied = workshop2Registrations.length;
  }
  await workshop2.save();

  console.log(`✅ Created ${workshop2Registrations.length} registrations for ${workshop2.title}`);
  console.log(`   - ${workshop2.stats.totalAttendees} checked in (ongoing)`);

  // Workshop 3 (Upcoming) - Pending/Approved registrations
  const workshop3Participants = getRandomItems(users, 45);
  let workshop3Registrations = [];

  for (let i = 0; i < workshop3Participants.length; i++) {
    const user = workshop3Participants[i];
    const isPaid = i < 40; // 40 paid, 5 pending payment
    const isApproved = isPaid && i < 38; // 38 approved
    
    const registration = new WorkshopRegistration({
      workshopId: workshop3._id,
      userId: user._id,
      participantName: user.name,
      participantEmail: user.email,
      participantPhone: user.phone || `+880 17${Math.floor(10000000 + Math.random() * 90000000)}`,
      status: isApproved ? 'Approved' : 'Pending',
      paymentRequired: true,
      paymentStatus: isPaid ? 'Paid' : 'Pending',
      paymentAmount: 800,
      transactionId: isPaid ? `TXN-SEC-${Date.now()}-${i}` : null,
      paymentGateway: 'bKash',
      paidAt: isPaid ? getDateOffset(-2) : null,
      checkedIn: false,
      
      preworkCompleted: isPaid ? [workshop3.prework[0]._id] : [],
      
      completionPercentage: 0,
      isCompleted: false,
      certificateIssued: false,
      
      reminderSent: false
    });

    registration.qrToken = registration.generateQRToken();
    await registration.save();
    workshop3Registrations.push(registration);
  }

  workshop3.stats = {
    totalRegistrations: workshop3Registrations.length,
    totalAttendees: 0,
    totalApproved: workshop3Registrations.filter(r => r.status === 'Approved').length,
    totalCompleted: 0,
    totalCertificates: 0
  };
  await workshop3.save();

  console.log(`✅ Created ${workshop3Registrations.length} registrations for ${workshop3.title}`);
  console.log(`   - ${workshop3.stats.totalApproved} approved, ${workshop3Registrations.length - workshop3.stats.totalApproved} pending approval`);

  // ==================== EVENT REGISTRATIONS ====================
  console.log('\n👥 Creating Event Registrations...');

  // Event 1 (Completed) - Full registrations with attendance
  const event1Participants = getRandomItems(users, 80);
  let event1Registrations = [];

  for (let i = 0; i < event1Participants.length; i++) {
    const user = event1Participants[i];
    const attended = i < 72; // 72 out of 80 attended
    
    const regNumber = await EventRegistration.generateRegistrationNumber(event1._id);
    const registration = new EventRegistration({
      eventId: event1._id,
      userId: user._id,
      registrationNumber: regNumber,
      status: attended ? 'Attended' : 'Confirmed',
      
      attendeeInfo: {
        name: user.name,
        email: user.email,
        phone: user.phone || `+880 17${Math.floor(10000000 + Math.random() * 90000000)}`,
        organization: 'BUET',
        designation: 'Student'
      },
      
      paymentRequired: false,
      paymentStatus: 'Not_Required',
      
      checkInTime: attended ? new Date(event1.eventDate.getTime() + Math.random() * 60 * 60 * 1000) : null,
      attendanceMarked: attended,
      
      registeredBy: user._id
    });

    if (rooms.length > 0 && event1.roomAssignment.enabled && attended) {
      registration.seatAssignment = {
        roomId: rooms[0]._id,
        seatNumber: `S${i + 1}`,
        row: Math.floor(i / 20) + 1,
        position: (i % 20) + 1,
        assignedAt: getDateOffset(-46),
        autoAssigned: false
      };
    }

    await registration.save();
    event1Registrations.push(registration);
  }

  event1.stats = {
    totalRegistrations: event1Registrations.length,
    totalAttendees: event1Registrations.filter(r => r.attendanceMarked).length,
    totalPosts: 5,
    totalComments: 23,
    averageRating: 4.5
  };
  event1.attendanceTracking.totalCheckIns = event1.stats.totalAttendees;
  if (event1.roomAssignment.enabled) {
    event1.roomAssignment.totalSeatsOccupied = event1.stats.totalAttendees;
  }
  await event1.save();

  console.log(`✅ Created ${event1Registrations.length} registrations for ${event1.title}`);
  console.log(`   - ${event1.stats.totalAttendees} attended`);

  // Event 2 (Ongoing Hackathon) - Confirmed registrations
  const event2Participants = getRandomItems(users, 120);
  let event2Registrations = [];

  for (let i = 0; i < event2Participants.length; i++) {
    const user = event2Participants[i];
    const checkedIn = i < 115; // Most have checked in
    
    const regNumber = await EventRegistration.generateRegistrationNumber(event2._id);
    const registration = new EventRegistration({
      eventId: event2._id,
      userId: user._id,
      registrationNumber: regNumber,
      status: checkedIn ? 'Attended' : 'Confirmed',
      
      attendeeInfo: {
        name: user.name,
        email: user.email,
        phone: user.phone || `+880 17${Math.floor(10000000 + Math.random() * 90000000)}`,
        organization: 'BUET'
      },
      
      paymentRequired: true,
      paymentStatus: 'Completed',
      paymentAmount: 200,
      paymentMethod: 'bKash',
      paymentTransactionId: `HACK-TXN-${Date.now()}-${i}`,
      paymentDate: getDateOffset(-5),
      
      checkInTime: checkedIn ? getDateOffset(-1) : null,
      attendanceMarked: checkedIn,
      
      registeredBy: user._id
    });

    await registration.save();
    event2Registrations.push(registration);
  }

  event2.stats = {
    totalRegistrations: event2Registrations.length,
    totalAttendees: event2Registrations.filter(r => r.attendanceMarked).length,
    totalPosts: 12,
    totalComments: 45
  };
  event2.attendanceTracking.totalCheckIns = event2.stats.totalAttendees;
  event2.revenue = event2Registrations.length * 200;
  await event2.save();

  console.log(`✅ Created ${event2Registrations.length} registrations for ${event2.title}`);
  console.log(`   - ${event2.stats.totalAttendees} checked in (ongoing)`);

  // Event 4 (Upcoming Career Fair) - Some early registrations
  const event4Participants = getRandomItems(users.filter(u => u.year >= 3), 45);
  let event4Registrations = [];

  for (let i = 0; i < event4Participants.length; i++) {
    const user = event4Participants[i];
    
    const regNumber = await EventRegistration.generateRegistrationNumber(event4._id);
    const registration = new EventRegistration({
      eventId: event4._id,
      userId: user._id,
      registrationNumber: regNumber,
      status: 'Confirmed',
      
      attendeeInfo: {
        name: user.name,
        email: user.email,
        phone: user.phone || `+880 17${Math.floor(10000000 + Math.random() * 90000000)}`,
        organization: 'BUET',
        designation: `${user.year}th Year Student`
      },
      
      paymentRequired: false,
      paymentStatus: 'Not_Required',
      
      registeredBy: user._id
    });

    await registration.save();
    event4Registrations.push(registration);
  }

  event4.stats.totalRegistrations = event4Registrations.length;
  await event4.save();

  console.log(`✅ Created ${event4Registrations.length} registrations for ${event4.title}`);

  // ==================== SUMMARY ====================
  console.log('\n📊 Seeding Summary:');
  console.log('='.repeat(60));
  console.log(`\nWorkshops Created: ${workshops.length}`);
  workshops.forEach(w => {
    console.log(`  - ${w.title}`);
    console.log(`    Status: ${w.status} | Registrations: ${w.stats.totalRegistrations} | Completed: ${w.stats.totalCompleted}`);
  });
  
  console.log(`\nEvents Created: ${events.length}`);
  events.forEach(e => {
    console.log(`  - ${e.title}`);
    console.log(`    Status: ${e.status} | Registrations: ${e.stats.totalRegistrations} | Attendees: ${e.stats.totalAttendees}`);
  });
  
  const totalWorkshopRegs = workshops.reduce((sum, w) => sum + w.stats.totalRegistrations, 0);
  const totalEventRegs = events.reduce((sum, e) => sum + e.stats.totalRegistrations, 0);
  
  console.log(`\nTotal Workshop Registrations: ${totalWorkshopRegs}`);
  console.log(`Total Event Registrations: ${totalEventRegs}`);
  console.log(`Total Certificates Issued: ${workshops.reduce((sum, w) => sum + w.stats.totalCertificates, 0)}`);
  console.log('\n' + '='.repeat(60));
  console.log('✅ Seeding completed successfully!\n');
}

async function main() {
  try {
    await connectDB();
    await seedWorkshopsAndEvents();
  } catch (error) {
    console.error('\n❌ Error during seeding:', error);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { seedWorkshopsAndEvents };
