/**
 * Cleanup Test Students Script
 * 
 * Deletes all test students and their associated users from the database
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { User } = require('../src/models/User');
const { Member } = require('../src/models/Member');
const { EcTerm } = require('../src/models/EcTerm');
const { Election } = require('../src/models/Election');
const { ElectionCandidate } = require('../src/models/ElectionCandidate');
const { Vote } = require('../src/models/Vote');
const { EcAppointment } = require('../src/models/EcAppointment');
const { ElectionCommission } = require('../src/models/ElectionCommission');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/iplab';

async function main() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    console.log('🗑️  Cleaning up test data...\n');
    
    // Delete test students
    const testStudentIds = { studentId: /^(2020|2021|2022|2023|2024)\d{3}$/ };
    const testEmails = { email: /@cs\.du\.ac\.bd$/ };
    
    // Delete Votes
    const votesResult = await Vote.deleteMany({});
    console.log(`✅ Deleted ${votesResult.deletedCount} votes`);
    
    // Delete Election Candidates
    const candidatesResult = await ElectionCandidate.deleteMany({});
    console.log(`✅ Deleted ${candidatesResult.deletedCount} election candidates`);
    
    // Delete Election Commissions
    const commissionsResult = await ElectionCommission.deleteMany({});
    console.log(`✅ Deleted ${commissionsResult.deletedCount} election commissions`);
    
    // Delete Elections
    const electionsResult = await Election.deleteMany({});
    console.log(`✅ Deleted ${electionsResult.deletedCount} elections`);
    
    // Delete EC Appointments
    const appointmentsResult = await EcAppointment.deleteMany({});
    console.log(`✅ Deleted ${appointmentsResult.deletedCount} EC appointments`);
    
    // Delete EC Terms
    const termsResult = await EcTerm.deleteMany({});
    console.log(`✅ Deleted ${termsResult.deletedCount} EC terms`);
    
    // Delete Members
    const membersResult = await Member.deleteMany(testStudentIds);
    console.log(`✅ Deleted ${membersResult.deletedCount} test members`);
    
    // Delete Users
    const usersResult = await User.deleteMany(testEmails);
    console.log(`✅ Deleted ${usersResult.deletedCount} test users`);
    
    console.log('\n✅ Full cleanup completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Error during cleanup:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
  }
}

main();
