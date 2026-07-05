/**
 * Fix Student ID Format Script
 * 
 * This script fixes student IDs that are missing hyphens
 * Converts: 2021991111 → 2021-991-111
 * Format: YYYY-XXX-XXX (4 digits - 3 digits - 3 digits)
 */

const { connectDB } = require("../config/db");
const { Member } = require("../models/Member");
const { User } = require("../models/User");

/**
 * Check if student ID is valid format
 */
function isValidFormat(studentId) {
  // Valid format: YYYY-XXX-XXX
  const validPattern = /^\d{4}-\d{3}-\d{3}$/;
  return validPattern.test(studentId);
}

/**
 * Try to fix student ID format by adding hyphens
 */
function fixStudentIdFormat(studentId) {
  // Remove any existing hyphens or spaces
  const cleaned = studentId.replace(/[-\s]/g, '');
  
  // Check if it's a valid 10-digit student ID
  if (!/^\d{10}$/.test(cleaned)) {
    return null; // Cannot fix - not 10 digits
  }
  
  // Format: YYYY-XXX-XXX
  const year = cleaned.substring(0, 4);
  const part1 = cleaned.substring(4, 7);
  const part2 = cleaned.substring(7, 10);
  
  return `${year}-${part1}-${part2}`;
}

async function fixAllStudentIds() {
  try {
    await connectDB();
    console.log("Connected to database\n");

    const members = await Member.find({}).populate('userId');
    console.log(`Found ${members.length} members\n`);

    let fixed = 0;
    let alreadyValid = 0;
    let cannotFix = 0;
    let errors = 0;

    const fixedIds = [];
    const cannotFixIds = [];

    for (const member of members) {
      try {
        const currentId = member.studentId;

        // Check if already valid
        if (isValidFormat(currentId)) {
          alreadyValid++;
          continue;
        }

        // Try to fix the format
        const fixedId = fixStudentIdFormat(currentId);

        if (!fixedId) {
          console.log(`❌ Cannot fix: ${currentId} (not 10 digits)`);
          cannotFixIds.push(currentId);
          cannotFix++;
          continue;
        }

        // Check if fixed ID already exists (avoid duplicates)
        const existingMember = await Member.findOne({ 
          studentId: fixedId, 
          _id: { $ne: member._id } 
        });

        if (existingMember) {
          console.log(`⚠️  Cannot fix: ${currentId} → ${fixedId} (duplicate exists)`);
          cannotFixIds.push(currentId);
          cannotFix++;
          continue;
        }

        // Update student ID
        console.log(`✓ Fixing: ${currentId} → ${fixedId}`);
        member.studentId = fixedId;
        await member.save();

        fixedIds.push({
          old: currentId,
          new: fixedId,
          name: member.userId ? `${member.userId.firstName} ${member.userId.lastName}` : 'Unknown'
        });

        fixed++;
      } catch (err) {
        console.error(`Error processing member ${member.studentId}:`, err.message);
        errors++;
      }
    }

    // Print Summary
    console.log("\n" + "=".repeat(60));
    console.log("MIGRATION SUMMARY");
    console.log("=".repeat(60));
    console.log(`Total members:           ${members.length}`);
    console.log(`Already valid format:    ${alreadyValid}`);
    console.log(`Fixed:                   ${fixed}`);
    console.log(`Cannot fix:              ${cannotFix}`);
    console.log(`Errors:                  ${errors}`);
    console.log("=".repeat(60));

    if (fixedIds.length > 0) {
      console.log("\n✅ FIXED STUDENT IDs:");
      console.log("-".repeat(60));
      fixedIds.forEach(item => {
        console.log(`${item.old.padEnd(15)} → ${item.new.padEnd(15)} (${item.name})`);
      });
    }

    if (cannotFixIds.length > 0) {
      console.log("\n❌ COULD NOT FIX (Manual intervention needed):");
      console.log("-".repeat(60));
      cannotFixIds.forEach(id => {
        console.log(`  ${id}`);
      });
      console.log("\nThese IDs need manual correction in the database.");
    }

    console.log("\n✓ Migration completed successfully!\n");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

// Run the fix
fixAllStudentIds();
