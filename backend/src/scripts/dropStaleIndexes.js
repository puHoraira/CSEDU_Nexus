/**
 * One-time migration: drop the stale electionId_1_memberId_1_postId_1 index
 * from the electioncandidates collection.
 *
 * Run once with: node src/scripts/dropStaleIndexes.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { env } = require('../config/env');

async function run() {
  await mongoose.connect(env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;
  const collection = db.collection('electioncandidates');

  // List current indexes so we can confirm which ones exist
  const indexes = await collection.indexes();
  console.log('Current indexes:', indexes.map(i => i.name));

  const staleIndexName = 'electionId_1_memberId_1_postId_1';

  const exists = indexes.some(i => i.name === staleIndexName);
  if (!exists) {
    console.log(`Index "${staleIndexName}" not found — nothing to do.`);
  } else {
    await collection.dropIndex(staleIndexName);
    console.log(`Dropped stale index: ${staleIndexName}`);
  }

  await mongoose.disconnect();
  console.log('Done.');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
