/**
 * Setup EC Posts for Phase 1 (Posts 12+) and Phase 2 (Posts 1-11)
 * 
 * Usage: node backend/scripts/setup-ec-posts.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const { connectDB } = require("../src/config/db");
const { EcPost } = require("../src/models/EcPost");

async function main() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await connectDB();
    console.log("✅ Connected\n");

    // Phase 2 Posts (Office Bearers - Posts 1-11)
    const phase2Posts = [
      { code: "POST-01", title: "President", displayOrder: 1, phase: 2, isActive: true, responsibilities: "Lead the executive committee" },
      { code: "POST-02", title: "Vice President", displayOrder: 2, phase: 2, isActive: true, responsibilities: "Assist president" },
      { code: "POST-03", title: "General Secretary", displayOrder: 3, phase: 2, isActive: true, responsibilities: "Manage operations" },
      { code: "POST-04", title: "Assistant General Secretary", displayOrder: 4, phase: 2, isActive: true, responsibilities: "Assist GS" },
      { code: "POST-05", title: "Treasurer", displayOrder: 5, phase: 2, isActive: true, responsibilities: "Manage finances" },
      { code: "POST-06", title: "Assistant Treasurer", displayOrder: 6, phase: 2, isActive: true, responsibilities: "Assist treasurer" },
      { code: "POST-07", title: "Sports Secretary", displayOrder: 7, phase: 2, isActive: true, responsibilities: "Organize sports events" },
      { code: "POST-08", title: "Cultural Secretary", displayOrder: 8, phase: 2, isActive: true, responsibilities: "Organize cultural events" },
      { code: "POST-09", title: "Publication Secretary", displayOrder: 9, phase: 2, isActive: true, responsibilities: "Manage publications" },
      { code: "POST-10", title: "IT Secretary", displayOrder: 10, phase: 2, isActive: true, responsibilities: "Manage IT infrastructure" },
      { code: "POST-11", title: "Publicity Secretary", displayOrder: 11, phase: 2, isActive: true, responsibilities: "Handle publicity" },
    ];

    // Phase 1 Posts (Batch Representatives - Posts 12+)
    const phase1Posts = [
      { code: "POST-12", title: "Executive Member (Batch 2020)", displayOrder: 12, phase: 1, isActive: true },
      { code: "POST-13", title: "Executive Member (Batch 2021)", displayOrder: 13, phase: 1, isActive: true },
      { code: "POST-14", title: "Executive Member (Batch 2022)", displayOrder: 14, phase: 1, isActive: true },
      { code: "POST-15", title: "Executive Member (Batch 2023)", displayOrder: 15, phase: 1, isActive: true },
      { code: "POST-16", title: "Executive Member (Batch 2024)", displayOrder: 16, phase: 1, isActive: true },
    ];

    console.log("📋 Creating/Updating EC Posts...\n");

    // Upsert Phase 2 posts
    for (const post of phase2Posts) {
      await EcPost.findOneAndUpdate(
        { code: post.code },
        post,
        { upsert: true, new: true }
      );
      console.log(`✅ ${post.code}: ${post.title} (Phase ${post.phase})`);
    }

    // Upsert Phase 1 posts
    for (const post of phase1Posts) {
      await EcPost.findOneAndUpdate(
        { code: post.code },
        post,
        { upsert: true, new: true }
      );
      console.log(`✅ ${post.code}: ${post.title} (Phase ${post.phase})`);
    }

    const totalPosts = await EcPost.countDocuments();
    console.log(`\n🎉 Total EC Posts in database: ${totalPosts}`);
    console.log(`   Phase 2 (Posts 1-11): ${phase2Posts.length} office bearer positions`);
    console.log(`   Phase 1 (Posts 12+): ${phase1Posts.length} batch representative positions`);

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\n👋 Done");
  }
}

main();
