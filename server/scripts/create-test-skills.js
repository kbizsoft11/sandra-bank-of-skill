const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/bank_of_skill';

async function createTestSkills() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✓ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const skillsCollection = db.collection('skills');
    const categoriesCollection = db.collection('skillcategories');

    // Get first category
    const category = await categoriesCollection.findOne({});
    if (!category) {
      console.log('❌ No categories found. Please create a category first.');
      await mongoose.disconnect();
      return;
    }

    console.log(`📂 Using category: ${category.name} (${category._id})`);

    // Get an admin user
    const usersCollection = db.collection('users');
    const admin = await usersCollection.findOne({ role: 'admin' });
    if (!admin) {
      console.log('❌ No admin user found.');
      await mongoose.disconnect();
      return;
    }

    console.log(`👤 Using admin user: ${admin.fullName}\n`);

    // Create test skills
    const testSkills = [
      {
        name: 'JavaScript',
        description: 'JavaScript programming language',
        categoryId: category._id,
        createdBy: admin._id,
        createdType: 'ADMIN',
        companyId: null,
        archived: false,
        status: 'active'
      },
      {
        name: 'TypeScript',
        description: 'TypeScript superset of JavaScript',
        categoryId: category._id,
        createdBy: admin._id,
        createdType: 'ADMIN',
        companyId: null,
        archived: false,
        status: 'active'
      },
      {
        name: 'React',
        description: 'React JavaScript library',
        categoryId: category._id,
        createdBy: admin._id,
        createdType: 'ADMIN',
        companyId: null,
        archived: false,
        status: 'active'
      },
      {
        name: 'Angular',
        description: 'Angular framework',
        categoryId: category._id,
        createdBy: admin._id,
        createdType: 'ADMIN',
        companyId: null,
        archived: false,
        status: 'active'
      },
      {
        name: 'Node.js',
        description: 'Node.js runtime',
        categoryId: category._id,
        createdBy: admin._id,
        createdType: 'ADMIN',
        companyId: null,
        archived: false,
        status: 'active'
      }
    ];

    console.log(`🚀 Creating ${testSkills.length} test skills...\n`);

    const result = await skillsCollection.insertMany(testSkills);

    console.log(`✅ Created ${result.insertedCount} test skills:`);
    Object.values(result.insertedIds).forEach((id, index) => {
      console.log(`  ${index + 1}. ${testSkills[index].name} (${id})`);
    });

    console.log('\n🎉 Test skills created successfully!');
    console.log('You can now test bulk selection and actions in the skills list page.');

    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createTestSkills();
