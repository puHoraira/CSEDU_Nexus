/**
 * Check EC Term overlaps and list all terms with their dates
 * 
 * Usage: node backend/scripts/check-term-overlaps.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const { connectDB } = require("../src/config/db");
const { EcTerm } = require("../src/models/EcTerm");
const { EcAppointment } = require("../src/models/EcAppointment");
const { Election } = require("../src/models/Election");

async function main() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await connectDB();
    console.log("✅ Connected to MongoDB\n");

    // Get all terms
    const terms = await EcTerm.find({}).sort({ startsOn: 1 });
    
    console.log(`📋 Found ${terms.length} EC Terms:\n`);
    console.log("="  .repeat(100));
    
    for (const term of terms) {
      const appointments = await EcAppointment.countDocuments({ termId: term._id });
      const elections = await Election.countDocuments({ termId: term._id });
      
      console.log(`\n📌 ${term.name}`);
      console.log(`   ID: ${term._id}`);
      console.log(`   Status: ${term.status}`);
      console.log(`   Starts: ${term.startsOn.toISOString().split('T')[0]}`);
      console.log(`   Ends:   ${term.endsOn.toISOString().split('T')[0]}`);
      console.log(`   Appointments: ${appointments}`);
      console.log(`   Elections: ${elections}`);
      console.log(`   Can Delete: ${appointments === 0 && elections === 0 ? '✅ YES' : '❌ NO'}`);
    }
    
    console.log("\n" + "=".repeat(100));
    console.log("\n🔍 Checking for overlaps...\n");
    
    // Check overlaps
    let overlapsFound = false;
    for (let i = 0; i < terms.length; i++) {
      for (let j = i + 1; j < terms.length; j++) {
        const term1 = terms[i];
        const term2 = terms[j];
        
        // Check if they overlap
        const overlaps = 
          term1.startsOn <= term2.endsOn && 
          term1.endsOn >= term2.startsOn;
        
        if (overlaps) {
          overlapsFound = true;
          console.log(`⚠️  OVERLAP DETECTED:`);
          console.log(`   "${term1.name}" (${term1.startsOn.toISOString().split('T')[0]} to ${term1.endsOn.toISOString().split('T')[0]})`);
          console.log(`   "${term2.name}" (${term2.startsOn.toISOString().split('T')[0]} to ${term2.endsOn.toISOString().split('T')[0]})`);
          console.log();
        }
      }
    }
    
    if (!overlapsFound) {
      console.log("✅ No overlaps found!\n");
    }
    
    // Provide recommendations
    console.log("="  .repeat(100));
    console.log("\n💡 RECOMMENDATIONS:\n");
    
    for (const term of terms) {
      const appointments = await EcAppointment.countDocuments({ termId: term._id });
      const elections = await Election.countDocuments({ termId: term._id });
      
      if (elections > 0) {
        console.log(`⚠️  "${term.name}" has ${elections} election(s)`);
        console.log(`   → Delete elections first before deleting this term\n`);
      }
      
      if (appointments > 0 && elections === 0) {
        console.log(`⚠️  "${term.name}" has ${appointments} appointment(s) but no elections`);
        console.log(`   → Cannot delete (appointments are historical records)`);
        console.log(`   → You can only CLOSE this term\n`);
      }
      
      if (appointments === 0 && elections === 0) {
        console.log(`✅ "${term.name}" can be safely deleted\n`);
      }
    }

  } catch (error) {
    console.error("❌ Error:", error);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log("\n👋 Disconnected from MongoDB");
  }
}

main();
