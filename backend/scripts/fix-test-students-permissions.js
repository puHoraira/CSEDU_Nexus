/**
 * Fix test students to have proper permissions and roles
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/csedu';

async function main() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');
    
    const User = mongoose.connection.collection('users');
    const Member = mongoose.connection.collection('members');
    const UserRole = mongoose.connection.collection('userroles');
    const Role = mongoose.connection.collection('roles');
    
    console.log('📋 Finding test students...\n');
    
    // Find General Member role
    const generalMemberRole = await Role.findOne({ name: 'General Member' });
    if (!generalMemberRole) {
      throw new Error('General Member role not found in database!');
    }
    
    console.log(`Found General Member role: ${generalMemberRole._id}\n`);
    
    // Find all test students (those with email containing @test.com)
    const testUsers = await User.find({ 
      email: { $regex: /@test\.com$/i }
    }).toArray();
    
    console.log(`Found ${testUsers.length} test users\n`);
    
    let updatedCount = 0;
    let roleAssignments = 0;
    
    for (const user of testUsers) {
      // Update user roles array
      const hasGeneralMember = user.roles && user.roles.includes('General Member');
      
      if (!hasGeneralMember) {
        console.log(`Updating user: ${user.email}`);
        
        await User.updateOne(
          { _id: user._id },
          { 
            $set: { 
              roles: ['General Member'],
              isEmailVerified: true,
              status: 'Active'
            } 
          }
        );
        
        updatedCount++;
      }
      
      // Check if user has UserRole assignment
      const existingUserRole = await UserRole.findOne({
        userId: user._id,
        roleId: generalMemberRole._id
      });
      
      if (!existingUserRole) {
        console.log(`  Adding UserRole assignment for: ${user.email}`);
        
        await UserRole.insertOne({
          userId: user._id,
          roleId: generalMemberRole._id,
          startsAt: new Date('2024-01-01'),
          endsAt: null,
          assignedBy: user._id, // Self-assigned for test
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        roleAssignments++;
      }
      
      // Check if user has associated member
      const member = await Member.findOne({ userId: user._id });
      
      if (member) {
        // Ensure member has proper status
        if (member.status !== 'Active' || member.membershipStatus?.status !== 'Active') {
          console.log(`  Updating member for: ${user.email}`);
          
          await Member.updateOne(
            { _id: member._id },
            { 
              $set: { 
                status: 'Active',
                'membershipStatus.status': 'Active',
                'membershipStatus.since': new Date('2024-01-01'),
                'ecEligibility.isEligible': true
              } 
            }
          );
        }
      } else {
        console.log(`  ⚠️  No member record found for: ${user.email}`);
      }
    }
    
    console.log(`\n✅ Updated ${updatedCount} users`);
    console.log(`✅ Added ${roleAssignments} UserRole assignments`);
    console.log(`✅ All test students now have "General Member" role and proper permissions`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

main()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
