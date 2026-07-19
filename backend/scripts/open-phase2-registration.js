require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const { Election } = require('../src/models/Election');

async function openPhase2Registration() {
  try {
    const dbUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    await mongoose.connect(dbUri);
    console.log('Connected to MongoDB\n');

    // Find the election (electionsingle)
    const election = await Election.findOne({ name: 'electionsingle' }).sort({ createdAt: -1 });
    
    if (!election) {
      console.log('Election "electionsingle" not found');
      return;
    }

    console.log('Found election:', election.name);
    console.log('Current phase2 status:', election.phase2.status);
    
    // Set Phase 2 registration dates
    const now = new Date();
    const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    election.phase2.status = 'Registration_Open';
    election.phase2.candidateRegistrationStart = now;
    election.phase2.candidateRegistrationEnd = oneWeekLater;
    
    await election.save();
    
    console.log('\n✅ SUCCESS!');
    console.log('Phase 2 status updated to:', election.phase2.status);
    console.log('Registration start:', election.phase2.candidateRegistrationStart);
    console.log('Registration end:', election.phase2.candidateRegistrationEnd);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

openPhase2Registration();
