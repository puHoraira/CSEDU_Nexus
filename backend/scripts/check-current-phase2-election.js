require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const { Election } = require('../src/models/Election');

async function checkPhase2Election() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find the Phase 2 election (most recent one)
    const election = await Election.findOne({ 
      currentPhase: 2 
    }).sort({ createdAt: -1 });

    if (!election) {
      console.log('❌ No Phase 2 election found');
      return;
    }

    console.log('\n📊 Election Details:');
    console.log('ID:', election._id);
    console.log('Name:', election.name);
    console.log('Status:', election.status);
    console.log('Current Phase:', election.currentPhase);
    
    console.log('\n📋 Phase 2 Status:');
    console.log('Status:', election.phase2.status);
    console.log('Registration Start:', election.phase2.candidateRegistrationStart);
    console.log('Registration End:', election.phase2.candidateRegistrationEnd);
    console.log('Voting Start:', election.phase2.votingStart);
    console.log('Voting End:', election.phase2.votingEnd);

    // Check what's needed to open registration
    const now = new Date();
    console.log('\n🔍 Diagnosis:');
    console.log('Current time:', now);
    console.log('Phase 2 status should be: "Registration_Open"');
    console.log('Phase 2 status actually is:', election.phase2.status);
    
    if (election.phase2.status !== 'Registration_Open') {
      console.log('\n⚠️  PROBLEM: Phase 2 status is not "Registration_Open"');
      console.log('This is why candidate registration is failing.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
}

checkPhase2Election();
