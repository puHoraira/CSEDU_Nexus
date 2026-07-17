/**
 * Migration script to fix election status enum values
 * Old values: Draft, Active, Closed, Cancelled
 * New values: Draft, Setup, Phase1_Active, Phase1_Completed, Phase2_Active, Phase2_Completed, Completed, Cancelled
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/csedu';

async function fixElectionStatuses() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const Election = mongoose.connection.collection('elections');

    // Find all elections with old status values
    const electionsToFix = await Election.find({
      status: { $in: ['Active', 'Closed'] }
    }).toArray();

    console.log(`\n📊 Found ${electionsToFix.length} elections with old status values\n`);

    if (electionsToFix.length === 0) {
      console.log('✅ No elections need fixing');
      return;
    }

    for (const election of electionsToFix) {
      const oldStatus = election.status;
      const phase = election.phase || election.currentPhase || 1;
      let newStatus;

      // Map old status to new status based on phase
      if (oldStatus === 'Active') {
        newStatus = phase === 1 ? 'Phase1_Active' : 'Phase2_Active';
      } else if (oldStatus === 'Closed') {
        newStatus = 'Completed';
      } else {
        continue; // Skip if not Active or Closed
      }

      console.log(`Updating election "${election.name}"`);
      console.log(`  Phase: ${phase}`);
      console.log(`  Old status: ${oldStatus}`);
      console.log(`  New status: ${newStatus}`);

      await Election.updateOne(
        { _id: election._id },
        {
          $set: {
            status: newStatus,
            currentPhase: phase,
          }
        }
      );

      console.log(`  ✅ Updated\n`);
    }

    console.log(`✅ Successfully updated ${electionsToFix.length} elections`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run the script
fixElectionStatuses()
  .then(() => {
    console.log('\n✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
