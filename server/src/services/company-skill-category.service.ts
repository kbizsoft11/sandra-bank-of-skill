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
    return this.repository.findAllByCompany(companyId);
  }

  async getAdminCategories(page: number = 1, limit: number = 10, search: string = '') {
    const skip = (page - 1) * limit;
    
    const query: any = { createdType: 'ADMIN' };
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const [categories, total] = await Promise.all([
      this.skillCategoryRepository.find(query, skip, limit),
      this.skillCategoryRepository.countByQuery(query)
    ]);

    return {
      categories,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    };
  }

  async getAvailableAdminCategoriesForCompany(
    companyId: string,
    page: number = 1,
    limit: number = 10,
    search: string = ''
  ) {
    const skip = (page - 1) * limit;
    
    const query: any = { createdType: 'ADMIN' };
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const [categories, total, selectedMappings] = await Promise.all([
      this.skillCategoryRepository.find(query, skip, limit),
      this.skillCategoryRepository.countByQuery(query),
      this.repository.findAllByCompany(companyId)
    ]);

    const selectedCategoryIds = new Set(selectedMappings.map((m: any) => m.skillCategoryId));

    const categoriesWithStatus = categories.map((cat: any) => ({
      ...cat.toObject?.() || cat,
      isSelected: selectedCategoryIds.has(cat._id.toString())
    }));

    return {
      categories: categoriesWithStatus,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    };
  }
}
