const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/csedu';
const ELECTION_ID = '6a59d3a473c6d620655db9a5';

async function showVotes() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  
  const electionObjId = new mongoose.Types.ObjectId(ELECTION_ID);
  
  console.log('\n=== Vote Collections Check ===\n');
  
  const votesCollection = db.collection('votes');
  const electionvotesCollection = db.collection('electionvotes');
  
  const votesCount = await votesCollection.countDocuments({ electionId: electionObjId });
  const electionvotesCount = await electionvotesCollection.countDocuments({ electionId: electionObjId });
  
  console.log(`votes collection: ${votesCount}`);
  console.log(`electionvotes collection: ${electionvotesCount}`);
  
  if (electionvotesCount > 0) {
    console.log('\nSample from electionvotes:');
    const sample = await electionvotesCollection.findOne({ electionId: electionObjId });
    console.log(JSON.stringify(sample, null, 2));
  }
  
  await mongoose.disconnect();
}

showVotes().catch(console.error);
