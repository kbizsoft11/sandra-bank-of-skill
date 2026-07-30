const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/bank_of_skill';

async function analyzeSkills() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✓ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const collection = db.collection('skills');

    // 1. Total count
    const totalCount = await collection.countDocuments();
    console.log('=' .repeat(60));
    console.log('SKILL COLLECTION ANALYSIS');
    console.log('='.repeat(60));
    console.log(`\n1. TOTAL COUNT OF SKILLS: ${totalCount}\n`);

    // 2. Count NEW structure (has categoryId, name, description, createdBy, createdType)
    const newStructureQuery = {
      categoryId: { $exists: true },
      name: { $exists: true },
      createdBy: { $exists: true },
      createdType: { $exists: true }
    };
    const newStructureCount = await collection.countDocuments(newStructureQuery);
    console.log(`2. COUNT OF NEW STRUCTURE: ${newStructureCount}`);
    console.log(`   (has: categoryId, name, description, createdBy, createdType)\n`);

    // 3. Count OLD structure (missing categoryId or missing new fields)
    const oldStructureCount = totalCount - newStructureCount;
    console.log(`3. COUNT OF OLD STRUCTURE: ${oldStructureCount}`);
    console.log(`   (missing new fields or has old fields)\n`);

    // 4. Sample documents from NEW structure
    console.log('=' .repeat(60));
    console.log('SAMPLE NEW STRUCTURE DOCUMENTS:');
    console.log('='.repeat(60));
    const newSamples = await collection.find(newStructureQuery).limit(2).toArray();
    if (newSamples.length > 0) {
      newSamples.forEach((doc, index) => {
        console.log(`\nSample ${index + 1}:`);
        console.log(JSON.stringify(doc, null, 2));
      });
    } else {
      console.log('No documents found with new structure');
    }

    // 5. Sample documents from OLD structure
    console.log('\n' + '='.repeat(60));
    console.log('SAMPLE OLD STRUCTURE DOCUMENTS:');
    console.log('='.repeat(60));
    
    const oldStructureQuery = {
      $or: [
        { categoryId: { $exists: false } },
        { name: { $exists: false } },
        { createdBy: { $exists: false } },
        { createdType: { $exists: false } }
      ]
    };
    
    const oldSamples = await collection.find(oldStructureQuery).limit(2).toArray();
    if (oldSamples.length > 0) {
      oldSamples.forEach((doc, index) => {
        console.log(`\nSample ${index + 1}:`);
        console.log(JSON.stringify(doc, null, 2));
      });
    } else {
      console.log('No documents found with old structure');
    }

    // 6. Detailed breakdown
    console.log('\n' + '='.repeat(60));
    console.log('DETAILED BREAKDOWN:');
    console.log('='.repeat(60));

    // Check for documents missing specific fields
    const missingCategoryId = await collection.countDocuments({ categoryId: { $exists: false } });
    const missingName = await collection.countDocuments({ name: { $exists: false } });
    const missingCreatedBy = await collection.countDocuments({ createdBy: { $exists: false } });
    const missingCreatedType = await collection.countDocuments({ createdType: { $exists: false } });

    console.log(`\nDocuments missing categoryId: ${missingCategoryId}`);
    console.log(`Documents missing name: ${missingName}`);
    console.log(`Documents missing createdBy: ${missingCreatedBy}`);
    console.log(`Documents missing createdType: ${missingCreatedType}`);

    // Check for old field presence
    const hasCatId = await collection.countDocuments({ cat_id: { $exists: true } });
    const hasUserId = await collection.countDocuments({ user_id: { $exists: true } });
    const hasSkillName = await collection.countDocuments({ skill_name: { $exists: true } });
    const hasSkillLevel = await collection.countDocuments({ skill_level: { $exists: true } });

    console.log(`\nDocuments with OLD field cat_id: ${hasCatId}`);
    console.log(`Documents with OLD field user_id: ${hasUserId}`);
    console.log(`Documents with OLD field skill_name: ${hasSkillName}`);
    console.log(`Documents with OLD field skill_level: ${hasSkillLevel}`);

    // 7. Field usage statistics
    console.log('\n' + '='.repeat(60));
    console.log('FIELD USAGE STATISTICS:');
    console.log('='.repeat(60));

    const fieldStats = {
      name: await collection.countDocuments({ name: { $exists: true } }),
      description: await collection.countDocuments({ description: { $exists: true } }),
      categoryId: await collection.countDocuments({ categoryId: { $exists: true } }),
      createdBy: await collection.countDocuments({ createdBy: { $exists: true } }),
      createdType: await collection.countDocuments({ createdType: { $exists: true } }),
      companyId: await collection.countDocuments({ companyId: { $exists: true } }),
      archived: await collection.countDocuments({ archived: { $exists: true } }),
      status: await collection.countDocuments({ status: { $exists: true } }),
      createdAt: await collection.countDocuments({ createdAt: { $exists: true } }),
      updatedAt: await collection.countDocuments({ updatedAt: { $exists: true } })
    };

    console.log('\nNew Schema Fields:');
    Object.entries(fieldStats).forEach(([field, count]) => {
      const percentage = totalCount > 0 ? ((count / totalCount) * 100).toFixed(2) : 0;
      console.log(`  ${field}: ${count} (${percentage}%)`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('ANALYSIS COMPLETE');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

analyzeSkills();
