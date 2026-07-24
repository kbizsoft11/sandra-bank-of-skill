import { QuestionnaireResponseModel } from "../models/questionnaire-response.model";
import { QuestionnaireModel } from "../models/questionnaire.model";
import { QuestionAnswerModel } from "../models/question-answer.model";
import { Skill } from "../models/skill.model";
import { SkillCategory } from "../models/skillCategory.model";
import { ApiError } from "../utils/api-error";
import { StatusCodes } from "http-status-codes";

/**
 * Service to process questionnaire responses and automatically create/update employee skills
 */
class QuestionnaireSkillProcessorService {
  /**
   * Process a completed questionnaire response and create/update employee skills
   * @param responseId - The questionnaire response ID
   */
  async processQuestionnaireResponse(responseId: string): Promise<void> {
    try {
      // Get the questionnaire response
      const response = await QuestionnaireResponseModel.findById(responseId);
      if (!response) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Questionnaire response not found");
      }

      // Only process completed questionnaires
      if (response.status !== "completed") {
        console.log(`Questionnaire response ${responseId} is not completed yet. Status: ${response.status}`);
        return;
      }

      // Get the questionnaire to access questions
      const questionnaire = await QuestionnaireModel.findById(response.questionnaireId);
      if (!questionnaire) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Questionnaire not found");
      }

      // Get skill category for the questionnaire
      if (!questionnaire.skillCategoryId) {
        console.log(`Questionnaire ${questionnaire._id} does not have a skill category. Skipping skill creation.`);
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
          console.log(`Question ${answer.questionId} not found in questionnaire`);
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
          console.log(`Invalid skill level for question ${answer.questionId}: ${skillLevel}`);
          continue;
        }

        if (!interestLevel || interestLevel < 1 || interestLevel > 5) {
          console.log(`Invalid interest level for question ${answer.questionId}: ${interestLevel}`);
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

      // Create or update skills for the employee
      for (const skillData of skillsToCreate) {
        await this.createOrUpdateSkill(
          response.employeeId,
          skillCategory._id.toString(),
          skillData.skillName,
          skillData.skillLevel,
          skillData.interestLevel,
          response._id.toString(),
          skillData.skillId
        );
      }

      console.log(
        `Successfully processed questionnaire response ${responseId} and created/updated ${skillsToCreate.length} skills`
      );
    } catch (error: any) {
      console.error(`Error processing questionnaire response ${responseId}:`, error);
      throw error;
    }
  }

  /**
   * Create or update a skill for an employee from questionnaire response
   */
  private async createOrUpdateSkill(
    employeeId: string,
    categoryId: string,
    skillName: string,
    skillLevel: number,
    interestLevel: number,
    responseId: string,
    skillId?: string
  ): Promise<void> {
    try {
      // Check if skill already exists for this employee and category
      const existingSkill = await Skill.findOne({
        user_id: employeeId as any,
        cat_id: categoryId as any,
        skill_name: skillName,
      });

      // Map skill level (1-5) to skill level string
      const skillLevelMap: { [key: number]: string } = {
        1: "beginner",
        2: "intermediate",
        3: "advanced",
        4: "expert",
        5: "expert", // Map 5 to expert as well
      };

      const skillLevelString = skillLevelMap[skillLevel] || "beginner";

      // Calculate skill score based on skill level (each level = 20%)
      const skillScore = Math.min(100, skillLevel * 20);

      if (existingSkill) {
        // Update existing skill
        existingSkill.skill_level = skillLevelString;
        existingSkill.skill_score = skillScore;
        existingSkill.interest_level = interestLevel;
        existingSkill.isFromQuestionnaire = true;
        existingSkill.questionnaireResponseId = responseId as any;
        await existingSkill.save();

        console.log(
          `Updated existing skill: ${skillName} for employee ${employeeId} with level ${skillLevel} and interest ${interestLevel}`
        );
      } else {
        // Create new skill
        const newSkill = new Skill({
          cat_id: categoryId,
          user_id: employeeId,
          skill_name: skillName,
          skill_level: skillLevelString,
          skill_score: skillScore,
          interest_level: interestLevel,
          isFromQuestionnaire: true,
          questionnaireResponseId: responseId,
        });

        await newSkill.save();

        console.log(
          `Created new skill: ${skillName} for employee ${employeeId} with level ${skillLevel} and interest ${interestLevel}`
        );
      }
    } catch (error: any) {
      console.error(`Error creating/updating skill ${skillName}:`, error);
      throw error;
    }
  }

  /**
   * Reprocess a questionnaire response (useful for corrections or updates)
   */
  async reprocessQuestionnaireResponse(responseId: string): Promise<void> {
    // Delete existing skills created from this response
    await Skill.deleteMany({ questionnaireResponseId: responseId as any });

    // Process the response again
    await this.processQuestionnaireResponse(responseId);
  }
}

export default new QuestionnaireSkillProcessorService();
