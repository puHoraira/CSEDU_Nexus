/**
 * Fix Phase Labels in Elections
 * ===========================
 * This script corrects any typos or inconsistencies in phase labels
 * stored in the Election collection.
 */

const mongoose = require('mongoose');
require('dotenv').config();

const { Election } = require('../src/models/Election');

async function fixPhaseLabels() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/iplab');
    console.log('Connected successfully');

    console.log('\nSearching for elections with incorrect phase labels...');
    
    const elections = await Election.find({});
    console.log(`Found ${elections.length} total elections`);

    let updatedCount = 0;

    for (const election of elections) {
      let needsUpdate = false;
      
      // Fix Phase 1 name
      if (election.phase1 && election.phase1.name) {
        const currentName = election.phase1.name;
        if (currentName.toLowerCase().includes('irepresentatives') || 
            currentName !== 'Batch Representative Election') {
          election.phase1.name = 'Batch Representative Election';
          election.phase1.description = 'Election for Executive Members (Posts 12+)';
          needsUpdate = true;
          console.log(`  → Fixing Phase 1 name in election "${election.name}": "${currentName}" → "Batch Representative Election"`);
        }
      }

      // Fix Phase 2 name
      if (election.phase2 && election.phase2.name) {
        const currentName = election.phase2.name;
        if (currentName !== 'Office Bearer Election') {
          election.phase2.name = 'Office Bearer Election';
          election.phase2.description = 'Election for Executive Committee Posts 1-11';
          needsUpdate = true;
          console.log(`  → Fixing Phase 2 name in election "${election.name}": "${currentName}" → "Office Bearer Election"`);
        }
      }

      if (needsUpdate) {
        await election.save();
        updatedCount++;
      }
    }

    console.log(`\n✓ Fixed ${updatedCount} election(s)`);
    console.log('Database cleanup complete!');

  } catch (error) {
    console.error('Error fixing phase labels:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run the script
if (require.main === module) {
  fixPhaseLabels()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { fixPhaseLabels };
