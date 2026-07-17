const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function fixPasswords() {
  try {
    console.log('\n🔧 Fixing test student passwords...\n');
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    const User = mongoose.connection.collection('users');
    
    // Find all test students
    const testStudents = await User.find({ 
      email: { $regex: /^student\d+@test\.com$/ }
    }).toArray();
    
    console.log(`Found ${testStudents.length} test students\n`);
    
    // Generate the correct password hash
    const correctPasswordHash = await bcrypt.hash('Test@123', 10);
    console.log(`Generated password hash: ${correctPasswordHash.substring(0, 30)}...\n`);
    
    // Update all test students
    let updated = 0;
    for (const student of testStudents) {
      await User.updateOne(
        { _id: student._id },
        { $set: { passwordHash: correctPasswordHash, emailVerified: true } }
      );
      updated++;
      console.log(`✓ Fixed password and verified email for: ${student.email}`);
    }
    
    console.log(`\n✅ Successfully fixed ${updated} student passwords\n`);
    console.log('Test login credentials:');
    console.log('  Email: student2020001@test.com (or any batch 2020-2023)');
    console.log('  Password: Test@123\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB\n');
  }
}

fixPasswords();
