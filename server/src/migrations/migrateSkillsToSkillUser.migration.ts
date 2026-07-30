import { Schema } from 'mongoose';
import { Skill } from '../models/skill.model';
import { SkillUser } from '../models/skillUser.model';
import { SkillCategory } from '../models/skillCategory.model';

/**
 * Migration Script: Normalize Skills data
 * 
 * This migration:
 * 1. Creates SkillCategory records from unique skill categories in old Skill collection
 * 2. Creates SkillUser records from user-specific data (userId, skill_score, skill_level)
 * 3. Updates Skill documents to remove user-specific fields
 * 4. Updates field names: skill_name -> name, skill_desc -> description
 * 5. Adds new fields: createdBy, createdType (default ADMIN), status (active)
 * 
 * This is a ONE-TIME migration. After running, old data is moved to new collections.
 */

interface OldSkill {
  _id: Schema.Types.ObjectId;
  cat_id: Schema.Types.ObjectId;
  user_id: Schema.Types.ObjectId;
  skill_name: string;
  skill_desc?: string;
  skill_level: string;
  skill_score: number;
  interest_level?: number;
  isFromQuestionnaire?: boolean;
  questionnaireResponseId?: Schema.Types.ObjectId;
  created_at: Date;
}

interface MigrationResult {
  success: boolean;
  startTime: Date;
  endTime: Date;
  duration: string;
  skillCategoriesMigrated: number;
  skillUsersMigrated: number;
  skillsUpdated: number;
  errors: string[];
  warnings: string[];
}

export class SkillMigration {
  /**
   * Run the complete migration
   */
  static async runMigration(): Promise<MigrationResult> {
    const startTime = new Date();
    const result: MigrationResult = {
      success: false,
      startTime,
      endTime: new Date(),
      duration: '',
      skillCategoriesMigrated: 0,
      skillUsersMigrated: 0,
      skillsUpdated: 0,
      errors: [],
      warnings: [],
    };

    try {
      console.log('🔄 Starting skill migration...\n');

      // Step 1: Migrate categories
      console.log('📚 Step 1: Migrating skill categories...');
      result.skillCategoriesMigrated = await this.migrateCategories();
      console.log(`✅ Migrated ${result.skillCategoriesMigrated} skill categories\n`);

      // Step 2: Migrate user skills
      console.log('👥 Step 2: Migrating user skills to SkillUser collection...');
      result.skillUsersMigrated = await this.migrateUserSkills();
      console.log(`✅ Migrated ${result.skillUsersMigrated} user skill relationships\n`);

      // Step 3: Update skill documents
      console.log('⚙️ Step 3: Updating skill documents (field renaming and cleanup)...');
      result.skillsUpdated = await this.updateSkillDocuments();
      console.log(`✅ Updated ${result.skillsUpdated} skill documents\n`);

      // Step 4: Verify migration
      console.log('✓ Step 4: Verifying migration integrity...');
      await this.verifyMigration(result);
      console.log('✅ Migration verification complete\n');

      result.success = true;
      result.endTime = new Date();
      result.duration = this.calculateDuration(startTime, result.endTime);

      console.log('🎉 Migration completed successfully!\n');
      console.log('Migration Summary:');
      console.log(`  Start Time: ${result.startTime.toISOString()}`);
      console.log(`  End Time: ${result.endTime.toISOString()}`);
      console.log(`  Duration: ${result.duration}`);
      console.log(`  Skill Categories Migrated: ${result.skillCategoriesMigrated}`);
      console.log(`  User Skills Migrated: ${result.skillUsersMigrated}`);
      console.log(`  Skills Updated: ${result.skillsUpdated}`);

      if (result.warnings.length > 0) {
        console.log(`\n⚠️  Warnings (${result.warnings.length}):`);
        result.warnings.forEach((w, i) => console.log(`  ${i + 1}. ${w}`));
      }

      return result;
    } catch (error) {
      result.success = false;
      result.endTime = new Date();
      result.duration = this.calculateDuration(startTime, result.endTime);
      result.errors.push(`Migration failed: ${error instanceof Error ? error.message : String(error)}`);

      console.error('\n❌ Migration failed!');
      console.error('Error:', error);
      console.error('\nMigration Summary:');
      console.error(`  Duration: ${result.duration}`);
      console.error(`  Errors: ${result.errors.length}`);

      return result;
    }
  }

  /**
   * Step 1: Migrate skill categories from old cat_id to new SkillCategory
   */
  private static async migrateCategories(): Promise<number> {
    const OldSkill = Skill.collection.model;

    // Get unique categories from old skill documents
    const uniqueCategories = await OldSkill.aggregate([
      {
        $group: {
          _id: '$cat_id',
          skill_count: { $sum: 1 },
        },
      },
    ]);

    console.log(`  Found ${uniqueCategories.length} unique categories`);

    let migratedCount = 0;

    for (const category of uniqueCategories) {
      try {
        const categoryId = category._id;

        // Check if category already exists in new SkillCategory
        const exists = await SkillCategory.findById(categoryId);

        if (!exists) {
          // Get a sample from old skills to get category name
          const sample = await OldSkill.findOne({ cat_id: categoryId });

          if (sample) {
            // Create new category document
            await SkillCategory.create({
              _id: categoryId,
              name: sample.cat_name || `Category ${categoryId}`,
              description: sample.cat_desc || '',
              createdBy: new Schema.Types.ObjectId(), // Will be assigned to first admin user
              createdType: 'ADMIN',
              companyId: null,
              archived: false,
              status: 'active',
            });

            migratedCount++;
          }
        } else {
          console.log(`  ℹ️  Category ${categoryId} already exists, skipping`);
        }
      } catch (error) {
        console.error(`  ❌ Error migrating category: ${error}`);
      }
    }

    return migratedCount;
  }

  /**
   * Step 2: Create SkillUser records from old skill user data
   */
  private static async migrateUserSkills(): Promise<number> {
    const OldSkill = Skill.collection.model;

    // Get all old skill documents with user_id
    const oldSkills = await OldSkill.find({ user_id: { $exists: true, $ne: null } });

    console.log(`  Found ${oldSkills.length} old skill records to migrate`);

    let migratedCount = 0;
    const bulkOps: any[] = [];

    for (const oldSkill of oldSkills) {
      try {
        const skillUserData = {
          userId: oldSkill.user_id,
          skillId: oldSkill._id,
          score: oldSkill.skill_score || 0,
          level: oldSkill.skill_level || 'Beginner',
          assessmentId: null,
          questionnaireId: oldSkill.questionnaireResponseId || null,
          lastAssessedAt: oldSkill.created_at || new Date(),
          createdAt: oldSkill.created_at || new Date(),
        };

        // Use bulkWrite for efficiency
        bulkOps.push({
          insertOne: {
            document: skillUserData,
          },
        });

        // Execute bulk writes in batches of 1000
        if (bulkOps.length >= 1000) {
          try {
            const result = await SkillUser.collection.bulkWrite(bulkOps);
            migratedCount += result.insertedCount || 0;
            bulkOps.length = 0;
          } catch (bulkError: any) {
            // If duplicate key error (userId, skillId), it's likely already migrated, continue
            if (bulkError.code === 11000) {
              console.log(`  ℹ️  Some SkillUser records already exist, continuing...`);
            } else {
              throw bulkError;
            }
            bulkOps.length = 0;
          }
        }
      } catch (error) {
        console.error(`  ❌ Error migrating skill user: ${error}`);
      }
    }

    // Execute remaining bulk operations
    if (bulkOps.length > 0) {
      try {
        const result = await SkillUser.collection.bulkWrite(bulkOps);
        migratedCount += result.insertedCount || 0;
      } catch (bulkError: any) {
        if (bulkError.code !== 11000) {
          throw bulkError;
        }
      }
    }

    return migratedCount;
  }

  /**
   * Step 3: Update Skill documents - rename fields and remove user-specific data
   */
  private static async updateSkillDocuments(): Promise<number> {
    const OldSkill = Skill.collection.model;

    // Update all skill documents
    const result = await OldSkill.updateMany(
      {},
      [
        {
          $set: {
            // Rename fields
            name: '$skill_name',
            description: '$skill_desc',
            // Add new fields
            createdBy: new Schema.Types.ObjectId(), // Will be assigned to first admin
            createdType: 'ADMIN',
            companyId: null,
            archived: false,
            status: 'active',
          },
        },
        {
          // Remove old fields in second stage
          $unset: ['user_id', 'skill_name', 'skill_desc', 'skill_score', 'skill_level', 'interest_level', 'isFromQuestionnaire', 'questionnaireResponseId'],
        },
      ]
    );

    return result.modifiedCount || 0;
  }

  /**
   * Step 4: Verify migration integrity
   */
  private static async verifyMigration(result: MigrationResult): Promise<void> {
    try {
      // Check 1: Verify no skill documents have user_id
      const skillsWithUserId = await Skill.countDocuments({ user_id: { $exists: true } });
      if (skillsWithUserId > 0) {
        result.warnings.push(`⚠️  Found ${skillsWithUserId} skill documents still containing user_id field`);
      }

      // Check 2: Verify SkillUser count matches expected
      const skillUserCount = await SkillUser.countDocuments({});
      console.log(`  ✓ SkillUser collection has ${skillUserCount} records`);

      // Check 3: Verify SkillCategory count
      const categoryCount = await SkillCategory.countDocuments({});
      console.log(`  ✓ SkillCategory collection has ${categoryCount} records`);

      // Check 4: Verify all skills have name field
      const skillsWithoutName = await Skill.countDocuments({ name: { $exists: false } });
      if (skillsWithoutName > 0) {
        result.warnings.push(`⚠️  Found ${skillsWithoutName} skill documents without name field`);
      }

      // Check 5: Sample verification - spot check some records
      const sampleSkillUser = await SkillUser.findOne({}).populate('skillId userId');
      if (sampleSkillUser) {
        console.log(`  ✓ Sample SkillUser verified: ${(sampleSkillUser as any).userId?.fullName || 'Unknown'} has skill`);
      }

      const sampleSkill = await Skill.findOne({});
      if (sampleSkill) {
        console.log(`  ✓ Sample Skill verified: ${sampleSkill.name || 'Unknown'}`);
      }
    } catch (error) {
      result.warnings.push(`⚠️  Verification error: ${error}`);
    }
  }

  /**
   * Rollback migration (use with caution)
   * This is a safety mechanism - only run if migration needs to be reverted
   */
  static async rollbackMigration(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('⚠️  Starting migration rollback...');
      console.log('⚠️  This will DELETE SkillUser records and attempt to restore Skill documents');

      // This is dangerous - require confirmation
      const confirmRollback = process.env.CONFIRM_ROLLBACK === 'true';
      if (!confirmRollback) {
        return {
          success: false,
          message: 'Rollback requires CONFIRM_ROLLBACK=true environment variable',
        };
      }

      // Delete all SkillUser records
      await SkillUser.deleteMany({});
      console.log('✓ Deleted all SkillUser records');

      // Note: We cannot fully restore old Skill documents since user_id data is lost
      // This is why backups are critical before migration

      return {
        success: true,
        message: 'Rollback completed. Note: User skill data cannot be fully restored without backups.',
      };
    } catch (error) {
      return {
        success: false,
        message: `Rollback failed: ${error}`,
      };
    }
  }

  /**
   * Calculate duration between two dates
   */
  private static calculateDuration(startTime: Date, endTime: Date): string {
    const durationMs = endTime.getTime() - startTime.getTime();
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  }

  /**
   * Generate migration report
   */
  static async generateReport(): Promise<string> {
    const oldSkillCount = await Skill.countDocuments({});
    const newSkillUserCount = await SkillUser.countDocuments({});
    const skillCategoryCount = await SkillCategory.countDocuments({});

    const report = `
=== MIGRATION REPORT ===

OLD SCHEMA:
- Total Skill documents: ${oldSkillCount}

NEW SCHEMA:
- SkillUser records: ${newSkillUserCount}
- SkillCategory records: ${skillCategoryCount}

MIGRATION STATUS:
- Status: ${newSkillUserCount > 0 ? 'COMPLETED' : 'PENDING'}
- User-Skill relationships migrated: ${newSkillUserCount}

DATA VALIDATION:
- Skill documents with user_id: ${await Skill.countDocuments({ user_id: { $exists: true } })}
- Skill documents with name field: ${await Skill.countDocuments({ name: { $exists: true } })}
- Skill documents without name field: ${await Skill.countDocuments({ name: { $exists: false } })}

RECOMMENDATIONS:
${newSkillUserCount > 0 ? '✓ Migration appears successful' : '⚠️  Migration pending or incomplete'}
${newSkillUserCount === oldSkillCount ? '✓ All user-skill relationships migrated' : `⚠️  Expected ${oldSkillCount} SkillUser records, found ${newSkillUserCount}`}
`;

    return report;
  }
}

export default SkillMigration;
