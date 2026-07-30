const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bank-your-skill';

async function fixIndexes() {
  try {
    console.log('Connecting to MongoDB...');
    const conn = await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 1,
      socketTimeoutMS: 5000,
    });

    const db = conn.connection.db;
    console.log('Connected to MongoDB\n');

    try {
      console.log('Dropping old indexes on skillcategories collection...');
      
      // Get all indexes
      const indexes = await db.collection('skillcategories').listIndexes().toArray();
      console.log('Current indexes:', indexes.map(i => i.name));

      // Drop specific old indexes
      try {
        await db.collection('skillcategories').dropIndex('cat_name_1');
        console.log('✓ Dropped cat_name_1 index');
      } catch (e) {
        console.log('  cat_name_1 index not found (ok)');
      }

      try {
        await db.collection('skillcategories').dropIndex('cat_name_1_cat_desc_1');
        console.log('✓ Dropped cat_name_1_cat_desc_1 index');
      } catch (e) {
        console.log('  cat_name_1_cat_desc_1 index not found (ok)');
      }

      // List remaining indexes
      const remainingIndexes = await db.collection('skillcategories').listIndexes().toArray();
      console.log('\nRemaining indexes:', remainingIndexes.map(i => i.name));
      
    } catch (error) {
      if (error.message.includes('ns not found')) {
        console.log('✓ Collection does not exist yet (will be created fresh)');
      } else {
        throw error;
      }
    }

    console.log('\n✓ Index cleanup complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

fixIndexes();
