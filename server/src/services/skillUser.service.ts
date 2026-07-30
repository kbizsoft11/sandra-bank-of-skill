import { StatusCodes } from "http-status-codes";
import { ApiError } from "../utils/api-error";
import skillUserRepository from "../repositories/skillUser.repository";
import skillRepository from "../repositories/skill.repository";
import { CreateSkillUserDto, UpdateSkillUserDto, GetSkillUsersQueryDto } from "../dto/skillUser.dto";
import { Schema } from "mongoose";

class SkillUserService {
  /**
   * Create or update user skill (for questionnaire flow)
   */
  async upsert(userId: string, skillId: string, data: UpdateSkillUserDto) {
    // Verify skill exists
    const skill = await skillRepository.findById(skillId);
    if (!skill) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Skill not found");
    }

    const skillUser = await skillUserRepository.upsert(userId, skillId, data);

    return skillUser;
  }

  /**
   * Get all skills for a user
   */
  async getByUser(userId: string, query: GetSkillUsersQueryDto = {}) {
    return skillUserRepository.findByUser(userId, query);
  }

  /**
   * Get all users for a skill
   */
  async getBySkill(skillId: string, query: GetSkillUsersQueryDto = {}) {
    // Verify skill exists
    const skill = await skillRepository.findById(skillId);
    if (!skill) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Skill not found");
    }

    return skillUserRepository.findBySkill(skillId, query);
  }

  /**
   * Get user skill by ID
   */
  async getById(id: string) {
    const skillUser = await skillUserRepository.findById(id);

    if (!skillUser) {
      throw new ApiError(StatusCodes.NOT_FOUND, "User skill not found");
    }

    return skillUser;
  }

  /**
   * Update user skill
   */
  async update(id: string, data: UpdateSkillUserDto) {
    const skillUser = await skillUserRepository.update(id, data);

    if (!skillUser) {
      throw new ApiError(StatusCodes.NOT_FOUND, "User skill not found");
    }

    return skillUser;
  }

  /**
   * Delete user skill
   */
  async delete(id: string) {
    const deleted = await skillUserRepository.delete(id);

    if (!deleted) {
      throw new ApiError(StatusCodes.NOT_FOUND, "User skill not found");
    }

    return { message: "User skill deleted successfully" };
  }

  /**
   * Get skills from questionnaire
   */
  async getFromQuestionnaire(questionnaireId: string) {
    return skillUserRepository.findByQuestionnaire(questionnaireId);
  }

  /**
   * Get user skills in enabled categories only
   */
  async getUserSkillsInEnabledCategories(userId: string, companyId: string) {
    return skillUserRepository.findUserSkillsInEnabledCategories(userId, companyId);
  }
}

export default new SkillUserService();
