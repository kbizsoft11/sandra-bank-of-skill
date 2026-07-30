/**
 * Script to fix existing questionnaires in MongoDB so that questionnaires with a skillCategoryId
 * have their title updated to match the SkillCategory's name.
 */

import mongoose from 'mongoose';
import { QuestionnaireModel } from '../models/questionnaire.model';
import { SkillCategory } from '../models/skillCategory.model';
import { env } from '../config/env';

async function fixQuestionnaireTitles() {
    try {
        await mongoose.connect(env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const questionnaires = await QuestionnaireModel.find({
            skillCategoryId: { $exists: true, $ne: null },
        });

        console.log(`📋 Found ${questionnaires.length} questionnaires with a skillCategoryId`);

        let updatedCount = 0;

        for (const questionnaire of questionnaires) {
            if (!questionnaire.skillCategoryId) continue;

            const category = await SkillCategory.findById(questionnaire.skillCategoryId).lean();

            if (category?.name) {
                const oldTitle = questionnaire.title;
                questionnaire.title = category.name;
                await questionnaire.save();
                console.log(`✅ Updated questionnaire ${questionnaire._id}: "${oldTitle}" -> "${category.name}"`);
                updatedCount++;
            }
        }

        console.log(`\n✅ Migration completed! Updated ${updatedCount} questionnaire title(s).`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

fixQuestionnaireTitles();
