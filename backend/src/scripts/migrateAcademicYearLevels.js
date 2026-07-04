const mongoose = require('mongoose');
const { Member } = require('../models/Member');
require('dotenv').config();

/**
 * Migration script to set academicYearLevel for existing members
 * based on their currentYear field
 */

const yearLevelMap = {
  1: 'First_Year',
  2: 'Second_Year',
  3: 'Third_Year',
  4: 'Fourth_Year',
  5: 'Masters'
};

async function migrateAcademicYearLevels() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/csedu_nexus', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected to MongoDB');
    console.log('Starting migration...\n');

    // Get all members without academicYearLevel or with default value
    const members = await Member.find({
      $or: [
        { academicYearLevel: { $exists: false } },
        { academicYearLevel: 'First_Year' }
      ]
    }).select('_id studentId currentYear batch academicYearLevel membershipStatus');

    console.log(`Found ${members.length} members to migrate\n`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const member of members) {
      try {
        const currentYear = member.currentYear || 1;
        const newYearLevel = yearLevelMap[currentYear] || 'First_Year';
        
        // Check if member has graduated
        if (member.membershipStatus?.status === 'Graduated') {
          member.academicYearLevel = 'Graduated';
          console.log(`[GRADUATED] ${member.studentId}: Set to Graduated`);
        } else {
          member.academicYearLevel = newYearLevel;
          console.log(
            `[UPDATE] ${member.studentId}: currentYear=${currentYear} -> academicYearLevel=${newYearLevel}`
          );
        }

        // Initialize empty arrays if they don't exist
        if (!member.promotionHistory) {
          member.promotionHistory = [];
        }

        if (!member.retentionStatus) {
          member.retentionStatus = {
            isRetained: false,
            retentionReason: null,
            retainedAt: null,
            retainedBy: null,
            originalPromotionYear: null
          };
        }

        await member.save();
        updated++;
      } catch (error) {
        console.error(`[ERROR] Failed to update ${member.studentId}:`, error.message);
        errors++;
      }
    }

    console.log('\n=== Migration Summary ===');
    console.log(`Total members processed: ${members.length}`);
    console.log(`Successfully updated: ${updated}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Errors: ${errors}`);
    console.log('========================\n');

    // Show distribution after migration
    const distribution = await Member.aggregate([
      {
        $group: {
          _id: '$academicYearLevel',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    console.log('Year Level Distribution:');
    distribution.forEach(d => {
      console.log(`  ${d._id}: ${d.count} students`);
    });

    console.log('\nMigration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateAcademicYearLevels();
