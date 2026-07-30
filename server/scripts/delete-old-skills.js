const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/bank_of_skill';

async function deleteOldSkills() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✓ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const collection = db.collection('skills');

    // Count total skills before deletion
    const totalBefore = await collection.countDocuments();
    console.log(`📊 Total skills BEFORE deletion: ${totalBefore}`);

    // Define OLD structure query - any skill missing the new fields
    const oldStructureQuery = {
      $or: [
        { categoryId: { $exists: false } },
        { name: { $exists: false } },
        { createdBy: { $exists: false } },
        { createdType: { $exists: false } }
      ]
    };

    // Count old structure skills
    const oldCount = await collection.countDocuments(oldStructureQuery);
    console.log(`🗑️  Old structure skills to delete: ${oldCount}\n`);

    if (oldCount === 0) {
      console.log('✓ No old structure skills found. Database is clean!');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Show sample old skills before deletion
    console.log('📋 Sample old skills to be deleted:');
    const samples = await collection.find(oldStructureQuery).limit(3).toArray();
    samples.forEach((doc, index) => {
      console.log(`  ${index + 1}. ${doc.skill_name || doc.name || 'Unknown'} (ID: ${doc._id})`);
    });

    // Confirm deletion
    console.log(`\n⚠️  WARNING: This will DELETE ${oldCount} old structure skills permanently!`);
    console.log('Press CTRL+C to cancel, or wait 5 seconds to proceed...\n');

    // Wait 5 seconds for user to cancel
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('🚀 Starting deletion...\n');

    // Delete old structure skills
    const result = await collection.deleteMany(oldStructureQuery);
    console.log(`✅ Deleted: ${result.deletedCount} old structure skills`);

    // Count total skills after deletion
    const totalAfter = await collection.countDocuments();
    console.log(`\n📊 Total skills AFTER deletion: ${totalAfter}`);

    // Verify all remaining skills have new structure
    const remainingOld = await collection.countDocuments(oldStructureQuery);
    console.log(`\n🔍 Verification - Old structure skills remaining: ${remainingOld}`);

    if (remainingOld === 0) {
      console.log('✓ All remaining skills have NEW structure!');
      console.log('\n🎉 Cleanup completed successfully!');
    } else {
      console.log('⚠️  WARNING: Some old structure skills remain!');
    }

    // Show stats of new structure
    const newStructureQuery = {
      categoryId: { $exists: true },
      name: { $exists: true },
      createdBy: { $exists: true },
      createdType: { $exists: true }
    };
    const newCount = await collection.countDocuments(newStructureQuery);
    console.log(`\n📈 New structure skills remaining: ${newCount}`);

    await mongoose.disconnect();
    console.log('\n✓ Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

deleteOldSkills();
