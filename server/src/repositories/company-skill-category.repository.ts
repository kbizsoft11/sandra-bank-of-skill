import { CompanySkillCategory } from '../models/company-skill-category.model';
import {
  CreateCompanySkillCategoryDto,
  UpdateCompanySkillCategoryDto
} from '../dto/company-skill-category.dto';

export class CompanySkillCategoryRepository {
  async create(payload: CreateCompanySkillCategoryDto & { companyId: string }) {
    return CompanySkillCategory.create(payload);
  }

  async findById(id: string) {
    return CompanySkillCategory.findById(id);
  }

  async findAllByCompany(companyId: string) {
    return CompanySkillCategory.find({ companyId }).sort({ createdAt: -1 });
  }

  async findByCompanyAndCategory(companyId: string, skillCategoryId: string) {
    return CompanySkillCategory.findOne({ companyId, skillCategoryId });
  }

  async update(id: string, payload: UpdateCompanySkillCategoryDto) {
    return CompanySkillCategory.findByIdAndUpdate(
      id,
      payload,
      {
        new: true,
      }
    );
  }

  async delete(id: string) {
    return CompanySkillCategory.findByIdAndDelete(id);
  }
}
