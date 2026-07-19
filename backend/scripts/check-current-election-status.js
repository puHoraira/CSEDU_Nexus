require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const { Election } = require('../src/models/Election');

async function checkElectionStatus() {
  try {
    const dbUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    console.log('Connecting to:', dbUri ? 'MongoDB (URI found)' : 'ERROR: No URI');
    await mongoose.connect(dbUri);
    console.log('Connected to MongoDB');

    // Get elections sorted by creation date
    const elections = await Election.find().sort({ createdAt: -1 }).limit(3);
    
    if (elections.length === 0) {
      console.log('No elections found');
      return;
    }

    console.log(`\n=== LAST ${elections.length} ELECTIONS ===\n`);
    
    for (const election of elections) {
      console.log('----------------------------------------');
      console.log('ID:', election._id);
      console.log('Name:', election.name);
      console.log('Election Type:', election.electionType || 'full');
      console.log('Created:', election.createdAt);
      console.log('\nSTATUS FIELDS:');
      console.log('  election.status:', election.status);
      console.log('  election.currentPhase:', election.currentPhase);
      console.log('  phase1.status:', election.phase1.status);
      console.log('  phase2.status:', election.phase2.status);
      console.log('  phase2.candidateRegistrationStart:', election.phase2.candidateRegistrationStart);
      console.log('  phase2.candidateRegistrationEnd:', election.phase2.candidateRegistrationEnd);
      console.log('\n');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

checkElectionStatus();
