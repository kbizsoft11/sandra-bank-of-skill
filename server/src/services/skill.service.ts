import { CreateSkillDto, GetSkillQueryDto, UpdateSkillDto } from "../dto/skill.dto";
import skillRepository from "../repositories/skill.repository";
import { SkillCategoryRepository } from "../repositories/skill-category.repository";
import { userRepository } from "../repositories/user.repository";
import { CompanySkillCategoryRepository } from "../repositories/company-skill-category.repository";
import { ApiError } from "../utils/api-error";
import { StatusCodes } from "http-status-codes";

class SkillService {
  async create(payload: CreateSkillDto) {
    const skillCategoryRepository = new SkillCategoryRepository();
    const category = await skillCategoryRepository.findById(payload.cat_id);

    if (!category) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        "Skill category not found."
      );
    }

    const user = await userRepository.findById(payload.user_id);

    if (!user) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        "User not found."
      );
    }

    const existingSkill = await skillRepository.findByName(
      payload.skill_name,
      payload.cat_id,
      payload.user_id
    );

    if (existingSkill) {
      throw new ApiError(
        StatusCodes.CONFLICT,
        "Skill already exists."
      );
    }

    return skillRepository.create(payload);
  }

  async getAll(query: GetSkillQueryDto, companyId?: string) {
    const result = await skillRepository.getAll(query);

    if (!companyId) {
      return result;
    }

    const companyMappings = await new CompanySkillCategoryRepository().findAllByCompany(companyId);
    const mappingByCategoryId = new Map(
      companyMappings.map((mapping: any) => [mapping.skillCategoryId.toString(), mapping.displayName])
    );

    const skills = result.skills.map((skill: any) => {
      const category = skill.cat_id as any;
      const categoryId = category && typeof category === 'object' && category !== null
        ? category._id?.toString() || category.toString()
        : category?.toString();

      const displayName = categoryId ? mappingByCategoryId.get(categoryId) : null;

      if (category && typeof category === 'object' && category !== null) {
        skill.cat_id = {
          ...(category as object),
          cat_name: displayName || category.cat_name,
        };
      }

      return skill;
    });

    return {
      ...result,
      skills,
    };
  }

  async getById(id: string, companyId?: string) {
    const skill = await skillRepository.findById(id);

    if (!skill) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        "Skill not found."
      );
    }

    if (companyId) {
      const companyMappings = await new CompanySkillCategoryRepository().findAllByCompany(companyId);
      const mappingByCategoryId = new Map(
        companyMappings.map((mapping: any) => [mapping.skillCategoryId.toString(), mapping.displayName])
      );

      const category = skill.cat_id as any;
      const categoryId = category && typeof category === 'object' && category !== null
        ? category._id?.toString() || category.toString()
        : category?.toString();

      const displayName = categoryId ? mappingByCategoryId.get(categoryId) : null;

      if (category && typeof category === 'object' && category !== null) {
        skill.cat_id = {
          ...(category as Record<string, unknown>),
          cat_name: displayName || category.cat_name,
        } as any;
      }
    }

    return skill;
  }

  async update(id: string, payload: UpdateSkillDto) {
    const skill = await skillRepository.findById(id);

    if (!skill) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        "Skill not found."
      );
    }

    if (payload.cat_id) {
        const skillCategoryRepository = new SkillCategoryRepository();
      const category = await skillCategoryRepository.findById(
        payload.cat_id
      );

      if (!category) {
        throw new ApiError(
          StatusCodes.NOT_FOUND,
          "Skill category not found."
        );
      }
    }

    if (payload.user_id) {
      const user = await userRepository.findById(
        payload.user_id
      );

      if (!user) {
        throw new ApiError(
          StatusCodes.NOT_FOUND,
          "User not found."
        );
      }
    }

    if (
      payload.skill_name &&
      (payload.cat_id || payload.user_id)
    ) {
      const existingSkill = await skillRepository.findByName(
        payload.skill_name,
        payload.cat_id ?? skill.cat_id.toString(),
        payload.user_id ?? skill.user_id.toString()
      );

      if (
        existingSkill &&
        existingSkill._id.toString() !== id
      ) {
        throw new ApiError(
          StatusCodes.CONFLICT,
          "Skill already exists."
        );
      }
    }

    return skillRepository.update(id, payload);
  }

  async delete(id: string) {
    const skill = await skillRepository.findById(id);

    if (!skill) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        "Skill not found."
      );
    }

    return skillRepository.delete(id);
  }
}

export default new SkillService();