#!/usr/bin/env node

/**
 * CLI Script to run skill migration
 * 
 * Usage:
 *   npm run migrate                    # Run migration
 *   npm run migrate:report             # Generate migration report
 *   npm run migrate:rollback           # Rollback migration (careful!)
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SkillMigration from '../migrations/migrateSkillsToSkillUser.migration';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bank-of-skill';

async function connectDatabase() {
  try {
    console.log('🔗 Connecting to database...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to database\n');
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    process.exit(1);
  }
}

async function disconnectDatabase() {
  try {
    await mongoose.disconnect();
    console.log('✅ Disconnected from database');
  } catch (error) {
    console.error('❌ Failed to disconnect:', error);
  }
}

async function main() {
  const command = process.argv[2];

  try {
    await connectDatabase();

    switch (command) {
      case 'run':
      case undefined: // Default command
        console.log('🚀 Running skill migration...\n');
        const result = await SkillMigration.runMigration();

        if (result.success) {
          console.log('\n✅ Migration successful!');
          process.exit(0);
        } else {
          console.error('\n❌ Migration failed!');
          result.errors.forEach((err) => console.error(`  - ${err}`));
          process.exit(1);
        }
        break;

      case 'report':
        console.log('📊 Generating migration report...\n');
        const report = await SkillMigration.generateReport();
        console.log(report);
        process.exit(0);
        break;

      case 'rollback':
        console.log('⚠️  WARNING: This will delete all SkillUser records!');
        console.log('⚠️  Ensure you have a database backup before proceeding.\n');

        const confirm = process.env.CONFIRM_ROLLBACK === 'true';
        if (!confirm) {
          console.log('❌ Rollback cancelled. Set CONFIRM_ROLLBACK=true to proceed.');
          process.exit(1);
        }

        const rollbackResult = await SkillMigration.rollbackMigration();
        console.log(rollbackResult.message);
        process.exit(rollbackResult.success ? 0 : 1);
        break;

      default:
        console.error(`Unknown command: ${command}`);
        console.error('\nAvailable commands:');
        console.error('  run       - Run migration');
        console.error('  report    - Generate migration report');
        console.error('  rollback  - Rollback migration (requires CONFIRM_ROLLBACK=true)');
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
}

// Run the script
main();
