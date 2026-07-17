/**
 * Fix Election Status Enum Values
 * ================================
 * This script corrects any invalid status values in the Election collection
 * to match the proper enum: Draft, Setup, Phase1_Active, Phase1_Completed, 
 * Phase2_Active, Phase2_Completed, Completed, Cancelled
 */

const mongoose = require('mongoose');
require('dotenv').config();

const { Election } = require('../src/models/Election');

const STATUS_MAPPING = {
  'Active': 'Phase1_Active',
  'Closed': 'Completed',
  'Open': 'Phase1_Active',
  'In_Progress': 'Phase1_Active'
};

async function fixElectionStatus() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/iplab');
    console.log('Connected successfully');

    console.log('\nSearching for elections with invalid status values...');
    
    const elections = await Election.find({});
    console.log(`Found ${elections.length} total elections`);

    let updatedCount = 0;
    const validStatuses = ['Draft', 'Setup', 'Phase1_Active', 'Phase1_Completed', 'Phase2_Active', 'Phase2_Completed', 'Completed', 'Cancelled'];

    for (const election of elections) {
      const currentStatus = election.status;
      
      // Check if status is invalid
      if (!validStatuses.includes(currentStatus)) {
        const newStatus = STATUS_MAPPING[currentStatus] || 'Draft';
        
        console.log(`  → Fixing election "${election.name}": "${currentStatus}" → "${newStatus}"`);
        
        // Use direct MongoDB update to bypass validation temporarily
        await mongoose.connection.collection('elections').updateOne(
          { _id: election._id },
          { $set: { status: newStatus } }
        );
        
        updatedCount++;
      }
    }

    console.log(`\n✓ Fixed ${updatedCount} election(s)`);
    console.log('Database status cleanup complete!');

  } catch (error) {
    console.error('Error fixing election status:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run the script
if (require.main === module) {
  fixElectionStatus()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { fixElectionStatus };
