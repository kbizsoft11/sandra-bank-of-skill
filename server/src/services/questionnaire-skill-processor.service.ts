import { QuestionnaireResponseModel } from "../models/questionnaire-response.model";
import { QuestionnaireModel } from "../models/questionnaire.model";
import { QuestionAnswerModel } from "../models/question-answer.model";
import { Skill } from "../models/skill.model";
import { SkillUser } from "../models/skillUser.model";
import { SkillCategory } from "../models/skillCategory.model";
import { ApiError } from "../utils/api-error";
import { StatusCodes } from "http-status-codes";
import skillUserRepository from "../repositories/skillUser.repository";
import { Schema } from "mongoose";

/**
 * Service to process questionnaire responses and automatically create SkillUser records
 * 
 * This service:
 * 1. Reads completed questionnaire responses
 * 2. Extracts skill questions and answers
 * 3. Creates/updates SkillUser records (normalized schema)
 * 4. Links questionnaire response via questionnaireId
 */
class QuestionnaireSkillProcessorService {
  /**
   * Process a completed questionnaire response and create/update SkillUser records
   * @param responseId - The questionnaire response ID
   */
  async processQuestionnaireResponse(responseId: string): Promise<void> {
    try {
      console.log(`\n🔄 [QUESTIONNAIRE SKILL PROCESSOR] Processing response: ${responseId}`);

      // Get the questionnaire response
      const response = await QuestionnaireResponseModel.findById(responseId);
      if (!response) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Questionnaire response not found");
      }

      // Only process completed questionnaires
      if (response.status !== "completed") {
        console.log(`⏭️  Questionnaire response ${responseId} is not completed yet. Status: ${response.status}`);
        return;
      }

      // Get the questionnaire to access questions
      const questionnaire = await QuestionnaireModel.findById(response.questionnaireId);
      if (!questionnaire) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Questionnaire not found");
      }

      // Get skill category for the questionnaire
      if (!questionnaire.skillCategoryId) {
        console.log(`⏭️  Questionnaire ${questionnaire._id} does not have a skill category. Skipping skill creation.`);
        return;
      }

      const skillCategory = await SkillCategory.findById(questionnaire.skillCategoryId);
      if (!skillCategory) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Skill category not found");
      }

      // Get all answered questions for this response
      const answeredQuestions = await QuestionAnswerModel.find({
        questionnaireResponseId: responseId,
        employeeId: response.employeeId,
        status: 'answered',
      });

      // Build a map of questionId to question details
      const questionMap = new Map(
        questionnaire.questions.map(q => [q.questionId, q])
      );

      console.log(`📋 Processing ${answeredQuestions.length} answered questions`);

      // Process each answered question
      const skillsToCreate: Array<{
        skillName: string;
        skillLevel: number;
        interestLevel: number;
        skillId?: string;
        questionId: string;
      }> = [];

      for (const answer of answeredQuestions) {
        // Find the corresponding question
        const question = questionMap.get(answer.questionId);

        if (!question) {
          console.log(`❌ Question ${answer.questionId} not found in questionnaire`);
          continue;
        }

        // Only process skill-type questions
        if (question.questionType !== "skill") {
          continue;
        }

        // Get skill level and interest level from the answer
        const skillLevel = answer.skillLevel;
        const interestLevel = answer.interestLevel;

        // Validate skill level and interest level
        if (!skillLevel || skillLevel < 1 || skillLevel > 5) {
          console.log(`❌ Invalid skill level for question ${answer.questionId}: ${skillLevel}`);
          continue;
        }

        if (!interestLevel || interestLevel < 1 || interestLevel > 5) {
          console.log(`❌ Invalid interest level for question ${answer.questionId}: ${interestLevel}`);
          continue;
        }

        skillsToCreate.push({
          skillName: question.skillName || question.questionText,
          skillLevel,
          interestLevel,
          skillId: question.skillId,
          questionId: question.questionId,
        });
      }

      console.log(`✅ Found ${skillsToCreate.length} skills to create/update`);

      // Create or update SkillUser records for each skill
      for (const skillData of skillsToCreate) {
        await this.createOrUpdateSkillUser(
          response.employeeId,
          skillData.skillName,
          skillData.skillLevel,
          skillData.interestLevel,
          responseId, // questionnaire response ID
          skillData.skillId
        );
      }

      console.log(
        `✅ Successfully processed questionnaire response ${responseId} and created/updated ${skillsToCreate.length} SkillUser records\n`
      );
    } catch (error: any) {
      console.error(`❌ Error processing questionnaire response ${responseId}:`, error);
      throw error;
    }
  }

  /**
   * Create or update a SkillUser record from questionnaire response
   * 
   * NEW NORMALIZED APPROACH:
   * - Finds or creates a Skill document (if not already existing)
   * - Creates/updates SkillUser record with userId, skillId, score, level, questionnaireId
   */
  private async createOrUpdateSkillUser(
    userId: string,
    skillName: string,
    skillLevel: number,
    interestLevel: number,
    questionnaireResponseId: string,
    skillId?: string
  ): Promise<void> {
    try {
      console.log(`  📝 Processing skill: ${skillName} (level: ${skillLevel}, interest: ${interestLevel})`);

      // Map skill level (1-5) to skill level string
      const skillLevelMap: { [key: number]: string } = {
        1: "Beginner",
        2: "Intermediate",
        3: "Advanced",
        4: "Expert",
        5: "Expert",
      };

      const skillLevelString = skillLevelMap[skillLevel] || "Beginner";

      // Calculate skill score based on skill level (each level = 20%)
      const skillScore = Math.min(100, skillLevel * 20);

      // Step 1: Ensure Skill exists (if skillId provided, use it; otherwise find/create)
      let skill: any;

      if (skillId) {
        // Use provided skillId
        skill = await Skill.findById(skillId);
        if (!skill) {
          console.warn(`  ⚠️  Skill with ID ${skillId} not found, creating new skill: ${skillName}`);
          skill = await Skill.create({
            name: skillName,
            description: `Created from questionnaire response`,
            createdBy: new Schema.Types.ObjectId(userId), // User who created this
            createdType: 'COMPANY', // From questionnaire (company-created)
            status: 'active',
          });
        }
      } else {
        // Find or create skill by name
        skill = await Skill.findOne({ name: skillName });
        if (!skill) {
          console.log(`  ✏️  Creating new skill: ${skillName}`);
          skill = await Skill.create({
            name: skillName,
            description: `Created from questionnaire response`,
            createdBy: new Schema.Types.ObjectId(userId),
            createdType: 'COMPANY',
            status: 'active',
          });
        }
      }

      // Step 2: Create or update SkillUser record
      const skillUserData = {
        userId,
        skillId: skill._id,
        score: skillScore,
        level: skillLevelString,
        questionnaireId: questionnaireResponseId,
        lastAssessedAt: new Date(),
      };

      // Upsert SkillUser (create if not exists, update if exists)
      const skillUser = await skillUserRepository.upsert(userId, skill._id.toString(), skillUserData);

      console.log(`  ✅ SkillUser record created/updated: ${skillName} -> ${skillLevelString} (${skillScore}%)`);

    } catch (error: any) {
      console.error(`  ❌ Error creating/updating SkillUser for ${skillName}:`, error.message);
      throw error;
    }
  }

  /**
   * Reprocess a questionnaire response (useful for corrections or updates)
   */
  async reprocessQuestionnaireResponse(responseId: string): Promise<void> {
    console.log(`\n🔄 [REPROCESS] Reprocessing questionnaire response: ${responseId}`);
    
    // Delete existing SkillUser records created from this response
    // (identified by questionnaireId matching the response ID)
    const deletedCount = await SkillUser.deleteMany({ 
      questionnaireId: new Schema.Types.ObjectId(responseId)
    });

    console.log(`🗑️  Deleted ${deletedCount.deletedCount} existing SkillUser records`);

    // Process the response again
    await this.processQuestionnaireResponse(responseId);
  }
}

export default new QuestionnaireSkillProcessorService();
