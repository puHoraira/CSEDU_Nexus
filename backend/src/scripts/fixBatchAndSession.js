/**
 * Migration Script: Fix Batch Numbers and Sessions
 * 
 * This script:
 * 1. Calculates correct batch numbers from student IDs or admission years
 * 2. Sets session field based on batch number
 * 3. Updates academic year level based on admission year
 */

const { connectDB } = require("../config/db");
const { Member } = require("../models/Member");
const {
  getBatchInfoFromStudentId,
  calculateBatchFromSession,
  formatSession,
  calculateAcademicYearLevel,
} = require("../utils/batchCalculator");

async function fixBatchAndSession() {
  try {
    await connectDB();
    console.log("Connected to database");

    const members = await Member.find({});
    console.log(`Found ${members.length} members`);

    let updated = 0;
    let errors = 0;

    for (const member of members) {
      try {
        let batchNumber = member.batch;
        let sessionYear = null;
        let session = member.session;
        let needsUpdate = false;

        // Try to extract batch info from student ID
        if (member.studentId) {
          try {
            const batchInfo = getBatchInfoFromStudentId(member.studentId);
            
            // Update batch number if different
            if (batchInfo.batchNumber !== member.batch) {
              console.log(`Updating batch for ${member.studentId}: ${member.batch} -> ${batchInfo.batchNumber}`);
              batchNumber = batchInfo.batchNumber;
              needsUpdate = true;
            }
            
            // Update session if missing or different
            if (!member.session || member.session !== batchInfo.session) {
              console.log(`Updating session for ${member.studentId}: ${member.session || 'none'} -> ${batchInfo.session}`);
              session = batchInfo.session;
              sessionYear = batchInfo.sessionYear;
              needsUpdate = true;
            } else {
              sessionYear = batchInfo.sessionYear;
            }
          } catch (err) {
            console.warn(`Could not parse student ID ${member.studentId}: ${err.message}`);
            
            // Fallback: calculate from batch number if available
            if (member.batch && !member.session) {
              sessionYear = 1994 + (member.batch - 1);
              session = formatSession(sessionYear);
              needsUpdate = true;
            }
          }
        } else if (member.batch && !member.session) {
          // Calculate session from batch number
          sessionYear = 1994 + (member.batch - 1);
          session = formatSession(sessionYear);
          needsUpdate = true;
        }

        // Calculate admission year if not set
        if (!member.admissionYear && sessionYear) {
          member.admissionYear = sessionYear;
          needsUpdate = true;
        }

        // Calculate academic year level based on admission year
        if (member.admissionYear) {
          const calculatedYearLevel = calculateAcademicYearLevel(member.admissionYear);
          if (calculatedYearLevel !== member.academicYearLevel) {
            console.log(`Updating academic year level for ${member.studentId}: ${member.academicYearLevel} -> ${calculatedYearLevel}`);
            member.academicYearLevel = calculatedYearLevel;
            needsUpdate = true;
          }
        }

        // Update numeric currentYear based on academicYearLevel
        const yearLevelToNumber = {
          'First_Year': 1,
          'Second_Year': 2,
          'Third_Year': 3,
          'Fourth_Year': 4,
          'Masters': 5,
          'Graduated': 5
        };
        const calculatedCurrentYear = yearLevelToNumber[member.academicYearLevel];
        if (calculatedCurrentYear && calculatedCurrentYear !== member.currentYear) {
          member.currentYear = calculatedCurrentYear;
          needsUpdate = true;
        }

        if (needsUpdate) {
          if (batchNumber) member.batch = batchNumber;
          if (session) member.session = session;
          
          await member.save();
          updated++;
        }
      } catch (err) {
        console.error(`Error processing member ${member.studentId}:`, err.message);
        errors++;
      }
    }

    console.log("\n=== Migration Summary ===");
    console.log(`Total members: ${members.length}`);
    console.log(`Updated: ${updated}`);
    console.log(`Errors: ${errors}`);
    console.log(`No changes needed: ${members.length - updated - errors}`);

    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

// Run migration
fixBatchAndSession();
