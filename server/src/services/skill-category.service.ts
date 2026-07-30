import { SkillCategoryRepository } from "../repositories/skill-category.repository";
import { StatusCodes } from "http-status-codes";
import { ApiError } from "../utils/api-error";
import { CreateSkillCategoryDto, UpdateSkillCategoryDto } from '../dto/skill-category.dto';

export class SkillCategoryService {

  private repository =
    new SkillCategoryRepository();

  create(
    payload: CreateSkillCategoryDto,
    userId: string,
    userRole: string,
    companyId?: string
  ) {
    const createdType = userRole === "admin" ? "ADMIN" : "COMPANY";
    
    return this.repository.create({
      name: payload.name,
      description: payload.description,
      createdBy: userId,
      createdType,
      companyId: companyId
    } as any);
  }

  getAll(filters?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    createdType?: string;
  }) {
    return this.repository.findAll(filters);
  }

  getById(id: string) {
    return this.repository.findById(id);
  }

  async update(
    id: string,
    payload: UpdateSkillCategoryDto,
    userRole?: string,
    companyId?: string
  ) {
    // If company role, verify ownership
    if (userRole === "company" && companyId) {
      const category = await this.repository.findById(id);
      
      if (!category) {
        throw new ApiError(
          StatusCodes.NOT_FOUND,
          'Category not found.'
        );
      }

      // Company can only update their own categories
      const categoryCompanyId = (category as any).companyId?.toString() || '';
      if ((category as any).createdType !== 'COMPANY' || categoryCompanyId !== companyId.toString()) {
        throw new ApiError(
          StatusCodes.FORBIDDEN,
          'You can only update your own categories.'
        );
      }
    }

    return this.repository.update(
      id,
      payload
    );
  }

  async updateStatus(id: string, isActive: boolean, userRole?: string, companyId?: string) {
    // If company role, verify ownership
    if (userRole === "company" && companyId) {
      const category = await this.repository.findById(id);
      
      if (!category) {
        throw new ApiError(
          StatusCodes.NOT_FOUND,
          'Category not found.'
        );
      }

      // Company can only update their own categories
      const categoryCompanyId = (category as any).companyId?.toString() || '';
      if ((category as any).createdType !== 'COMPANY' || categoryCompanyId !== companyId.toString()) {
        throw new ApiError(
          StatusCodes.FORBIDDEN,
          'You can only update your own categories.'
        );
      }
    }

    return this.repository.updateStatus(id, isActive);
  }

  async delete(id: string, userRole?: string, companyId?: string) {
    // If company role, verify ownership
    if (userRole === "company" && companyId) {
      const category = await this.repository.findById(id);
      
      if (!category) {
        throw new ApiError(
          StatusCodes.NOT_FOUND,
          'Category not found.'
        );
      }

      // Company can only delete their own categories
      const categoryCompanyId = (category as any).companyId?.toString() || '';
      if ((category as any).createdType !== 'COMPANY' || categoryCompanyId !== companyId.toString()) {
        throw new ApiError(
          StatusCodes.FORBIDDEN,
          'You can only delete your own categories.'
        );
      }
    }

    return this.repository.delete(id);
  }

}