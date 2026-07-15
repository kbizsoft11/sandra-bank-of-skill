/**
 * Script to fix employees who don't have onboarding questionnaires assigned
 * This is useful for employees created before the onboarding system was implemented
 */

import mongoose from 'mongoose';
import { UserModel } from '../models/user.model';
import { ensureDefaultOnboardingQuestionnaire, assignOnboardingQuestionnaires } from '../services/onboarding.service';
import { env } from '../config/env';

async function fixEmployeeOnboarding() {
    try {
        // Connect to MongoDB
        await mongoose.connect(env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Find all employees who haven't completed onboarding
        const employees = await UserModel.find({
            role: 'employee',
            hasCompletedOnboarding: false,
            tenantId: { $exists: true, $ne: '' },
            organisationId: { $exists: true, $ne: '' },
        });

        console.log(`📋 Found ${employees.length} employees without completed onboarding`);

        for (const employee of employees) {
            console.log(`\n👤 Processing employee: ${employee.email}`);
            console.log(`   TenantId: ${employee.tenantId}`);
            console.log(`   OrganisationId: ${employee.organisationId}`);

            try {
                // Ensure default questionnaire exists
                const questionnaireId = await ensureDefaultOnboardingQuestionnaire(
                    employee.tenantId!,
                    employee.organisationId!,
                    employee.organisationId! // Use org as creator
                );

                console.log(`   ✅ Questionnaire ensured: ${questionnaireId}`);

                // Assign to employee
                await assignOnboardingQuestionnaires(
                    employee._id.toString(),
                    employee.tenantId!,
                    employee.organisationId!,
                    employee.organisationId! // Use org as assigner
                );

                console.log(`   ✅ Questionnaire assigned to ${employee.email}`);
            } catch (error) {
                console.error(`   ❌ Error processing ${employee.email}:`, error);
            }
        }

        console.log('\n✅ Fix completed!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

// Run the script
fixEmployeeOnboarding();
