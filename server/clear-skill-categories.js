// Run this with: node clear-skill-categories.js
const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bank-your-skill';

const skillCategorySchema = new mongoose.Schema({
  name: String,
  description: String,
  createdBy: mongoose.Schema.Types.ObjectId,
  createdType: String,
  companyId: mongoose.Schema.Types.ObjectId,
  archived: Boolean,
  status: String,
  createdAt: Date,
  updatedAt: Date
}, { collection: 'skillcategories', strict: false });

async function clearCollection() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('skillcategories');

    // Drop all indexes except _id
    console.log('Dropping all indexes...');
    try {
      const indexInfo = await collection.getIndexes();
      for (const indexName of Object.keys(indexInfo)) {
        if (indexName !== '_id_') {
          await collection.dropIndex(indexName);
          console.log(`✓ Dropped index: ${indexName}`);
        }
      }
    } catch (e) {
      console.log('No indexes to drop');
    }

    // Delete all documents
    console.log('\nDeleting all skill category documents...');
    const result = await collection.deleteMany({});
    console.log(`✓ Deleted ${result.deletedCount} documents`);

    console.log('\n✓ Collection cleared successfully!');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

clearCollection();
