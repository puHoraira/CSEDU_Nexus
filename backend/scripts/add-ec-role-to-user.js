/**
 * Script to add Election Commissioner role to a specific user
 * and verify the roles are properly saved
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

const TARGET_USER_ID = '69d0a4dee609c45c62f7ff0f';

async function main() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');

    // Find the user
    console.log(`Looking up user: ${TARGET_USER_ID}`);
    const user = await User.findById(TARGET_USER_ID);
    
    if (!user) {
      console.error(`✗ User not found with ID: ${TARGET_USER_ID}`);
      process.exit(1);
    }

    console.log('\n=== USER INFORMATION ===');
    console.log(`Name: ${user.name}`);
    console.log(`Email: ${user.email}`);
    console.log(`Student ID: ${user.studentId}`);
    console.log(`Current Roles: ${JSON.stringify(user.roles)}`);
    console.log('========================\n');

    // Check if user already has Election Commissioner role
    const hasECRole = user.roles && user.roles.includes('Election Commissioner');
    
    if (hasECRole) {
      console.log('✓ User already has "Election Commissioner" role');
    } else {
      console.log('Adding "Election Commissioner" role...');
      
      // Initialize roles array if it doesn't exist
      if (!user.roles) {
        user.roles = [];
      }
      
      // Add the role
      user.roles.push('Election Commissioner');
      
      // Save the user
      await user.save();
      
      console.log('✓ Role added successfully');
    }

    // Verify the update
    const updatedUser = await User.findById(TARGET_USER_ID);
    console.log('\n=== UPDATED USER ROLES ===');
    console.log(`Roles: ${JSON.stringify(updatedUser.roles)}`);
    console.log('==========================\n');

    console.log('✅ Done! Please log out and log back in to get a new JWT token with the updated roles.');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n✓ Disconnected from MongoDB');
  }
}

main();
