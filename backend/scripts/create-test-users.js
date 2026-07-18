/**
 * Create test users for workshop and event testing
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User } = require('../src/models/User');
const { Member } = require('../src/models/Member');

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

async function createTestUsers() {
  console.log('\n👤 Creating test users...\n');

  const hashedPassword = await bcrypt.hash('password123', 10);
  const users = [];
  const members = [];

  // Create 200 test students
  for (let i = 1; i <= 200; i++) {
    const studentId = `20${18 + Math.floor(i / 50)}${String(i).padStart(4, '0')}`;
    const year = (i % 4) + 1;
    const batch = 2018 + Math.floor(i / 50);
    
    const user = new User({
      studentId,
      name: `Test Student ${i}`,
      email: `student${i}@test.com`,
      password: hashedPassword,
      role: 'Student',
      year,
      batch,
      phone: `+880 17${String(10000000 + i).slice(0, 8)}`,
      isActive: true,
      isVerified: true
    });

    await user.save();
    users.push(user);

    // Create member profile
    if (i <= 150) {
      const member = new Member({
        userId: user._id,
        studentId,
        name: user.name,
        email: user.email,
        phone: user.phone,
        year,
        batch,
        status: 'Active',
        membershipDate: new Date(2020 + year, 0, 1)
      });

      await member.save();
      members.push(member);
    }

    if (i % 50 === 0) {
      console.log(`Created ${i} users...`);
    }
  }

  console.log(`\n✅ Created ${users.length} users`);
  console.log(`✅ Created ${members.length} members`);
}

async function main() {
  try {
    await connectDB();
    
    // Check if users already exist
    const existingCount = await User.countDocuments({ email: /test\.com$/ });
    if (existingCount > 0) {
      console.log(`⚠️  Found ${existingCount} existing test users. Skipping...`);
    } else {
      await createTestUsers();
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

main();
