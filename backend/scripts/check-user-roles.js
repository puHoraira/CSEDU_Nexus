require('dotenv').config();
const mongoose = require('mongoose');

async function checkUserRoles() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');

    const { User } = require('../src/models/User');
    
    // Find user by ID from the logs
    const userId = '69d0a4dee609c45c62f7ff0f';
    const user = await User.findById(userId);
    
    if (!user) {
      console.log('User not found!');
      return;
    }
    
    console.log('\n=== USER INFORMATION ===');
    console.log('ID:', user._id);
    console.log('Email:', user.email);
    console.log('Name:', user.firstName, user.lastName);
    console.log('Roles:', user.roles || []);
    console.log('Is Active:', user.isActive);
    
    // Add Election Commissioner role if missing
    if (!user.roles || !user.roles.includes('Election Commissioner')) {
      console.log('\n=== ADDING ELECTION COMMISSIONER ROLE ===');
      if (!user.roles) user.roles = [];
      user.roles.push('Election Commissioner');
      await user.save();
      console.log('✓ Added Election Commissioner role');
      console.log('New roles:', user.roles);
    } else {
      console.log('\n✓ User already has Election Commissioner role');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from database');
  }
}

checkUserRoles();
