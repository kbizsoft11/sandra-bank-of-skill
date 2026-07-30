const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bank-your-skill';

async function cleanupSkillCategories() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB Connected');

    const db = mongoose.connection.db;

    // Drop the entire skillcategories collection to remove old indexes
    console.log('Dropping skillcategories collection...');
    try {
      await db.collection('skillcategories').drop();
      console.log('✓ skillcategories collection dropped');
    } catch (err) {
      if (err.message.includes('ns not found')) {
        console.log('✓ skillcategories collection does not exist (will be created fresh)');
      } else {
        throw err;
      }
    }

    console.log('\n✓ Cleanup complete!');
    console.log('Mongoose will recreate the collection with the new schema on next insert.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

cleanupSkillCategories();
