require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const { Election } = require('../src/models/Election');

async function fixPhase2Registration() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find Phase 2 elections with status "Phase2_Active" but phase2.status is NOT "Registration_Open"
    const elections = await Election.find({
      status: 'Phase2_Active',
      'phase2.status': { $ne: 'Registration_Open' }
    });

    if (elections.length === 0) {
      console.log('✅ No elections need fixing. All Phase 2 Active elections have proper registration status.');
      return;
    }

    console.log(`\n📋 Found ${elections.length} election(s) that need fixing:\n`);

    for (const election of elections) {
      console.log(`🔧 Fixing election: ${election.name} (ID: ${election._id})`);
      console.log(`   Before: phase2.status = "${election.phase2.status}"`);

      // Set Phase 2 registration to open with dates
      const now = new Date();
      const registrationEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

      election.phase2.status = 'Registration_Open';
      election.phase2.candidateRegistrationStart = now;
      election.phase2.candidateRegistrationEnd = registrationEnd;

      await election.save();

      console.log(`   After: phase2.status = "Registration_Open"`);
      console.log(`   Registration Start: ${now.toISOString()}`);
      console.log(`   Registration End: ${registrationEnd.toISOString()}`);
      console.log('   ✅ Fixed!\n');
    }

    console.log(`\n✅ Successfully fixed ${elections.length} election(s)`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
}

fixPhase2Registration();
