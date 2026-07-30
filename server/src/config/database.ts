import mongoose from 'mongoose';
import { env } from "./env";

export const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(env.MONGO_URI!);

    console.log('MongoDB Connected Successfully');

    // Migration: Fix skill categories collection indexes
    await fixSkillCategoriesIndexes();
  } catch (error) {
    console.error('MongoDB Connection Failed');

    console.error(error);

    process.exit(1);
  }
};

async function fixSkillCategoriesIndexes() {
  try {
    const db = mongoose.connection.db;
    if (!db) return;

    const collection = db.collection('skillcategories');
    
    // Check if collection exists
    const collections = await db.listCollections().toArray();
    const collectionExists = collections.some(c => c.name === 'skillcategories');
    
    if (!collectionExists) {
      console.log('[Migration] skillcategories collection does not exist yet (will be created fresh)');
      return;
    }

    // Get current indexes
    const indexes = await (collection as any).listIndexes().toArray();
    const indexNames = indexes.map((idx: any) => idx.name);
    console.log('[Migration] Current indexes on skillcategories:', indexNames);

    // Drop old indexes that don't match the new schema
    const oldIndexesToDrop = ['cat_name_1', 'cat_name_1_cat_desc_1', 'isActive_1'];
    
    for (const indexName of oldIndexesToDrop) {
      if (indexNames.includes(indexName)) {
        try {
          await collection.dropIndex(indexName);
          console.log(`[Migration] ✓ Dropped old index: ${indexName}`);
        } catch (e) {
          console.log(`[Migration] Could not drop ${indexName}: ${(e as any).message}`);
        }
      }
    }

    // Clear any documents with old field names that might cause issues
    const oldDocuments = await collection.findOne({ cat_name: { $exists: true } });
    if (oldDocuments) {
      console.log('[Migration] Found documents with old field names (cat_name), deleting collection...');
      await collection.deleteMany({});
      console.log('[Migration] ✓ Cleared skillcategories collection');
    }

  } catch (error) {
    console.warn('[Migration] Warning during skillcategories migration:', (error as any).message);
    // Don't fail the server startup on migration errors
  }
}