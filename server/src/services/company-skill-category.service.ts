import { StatusCodes } from 'http-status-codes';

import { CompanySkillCategoryRepository } from '../repositories/company-skill-category.repository';
import { SkillCategoryRepository } from '../repositories/skill-category.repository';
import { ApiError } from '../utils/api-error';
import {
  CreateCompanySkillCategoryDto,
  UpdateCompanySkillCategoryDto
} from '../dto/company-skill-category.dto';

export class CompanySkillCategoryService {
  private repository = new CompanySkillCategoryRepository();
  private skillCategoryRepository = new SkillCategoryRepository();

  async create(companyId: string, payload: CreateCompanySkillCategoryDto) {
    const category = await this.skillCategoryRepository.findById(payload.skillCategoryId);

    if (!category) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        'Skill category not found.'
      );
    }

    const existing = await this.repository.findByCompanyAndCategory(
      companyId,
      payload.skillCategoryId
    );

    if (existing) {
      throw new ApiError(
        StatusCodes.CONFLICT,
        'A mapping for this skill category already exists for the company.'
      );
    }

    return this.repository.create({
      companyId,
      skillCategoryId: payload.skillCategoryId,
      displayName: payload.displayName,
    });
  }

  async update(id: string, companyId: string, payload: UpdateCompanySkillCategoryDto) {
    const mapping = await this.repository.findById(id);

    if (!mapping) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        'Company skill category mapping not found.'
      );
    }

    if (mapping.companyId !== companyId) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'You can only update your company mappings.'
      );
    }

    return this.repository.update(id, payload);
  }

  async delete(id: string, companyId: string) {
    const mapping = await this.repository.findById(id);

    if (!mapping) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        'Company skill category mapping not found.'
      );
    }

    if (mapping.companyId !== companyId) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'You can only delete your company mappings.'
      );
    }

    return this.repository.delete(id);
  }

  async getCompanyCategories(companyId: string) {
    const [adminCategories, companyMappings] = await Promise.all([
      this.skillCategoryRepository.findAll(),
      this.repository.findAllByCompany(companyId),
    ]);

    const mappingByCategoryId = new Map(
      companyMappings.map((mapping: any) => [mapping.skillCategoryId, mapping])
    );

    return adminCategories.map((category: any) => {
      const mapping = mappingByCategoryId.get(category._id.toString());

      return {
        categoryId: category._id.toString(),
        originalName: category.cat_name,
        displayName: mapping?.displayName || category.cat_name,
        mappingId: mapping?._id?.toString(),
      };
    });
  }
}
