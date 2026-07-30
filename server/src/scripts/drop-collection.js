const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bank-your-skill';

async function dropCollection() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('bank-your-skill');
    
    console.log('Dropping skillcategories collection...');
    await db.collection('skillcategories').drop();
    console.log('✓ Collection dropped successfully');
    
  } catch (error) {
    if (error.message.includes('ns not found')) {
      console.log('✓ Collection does not exist');
    } else {
      console.error('Error:', error.message);
      throw error;
    }
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

dropCollection().catch(console.error);
