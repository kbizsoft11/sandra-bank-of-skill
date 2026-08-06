import { SkillCategoryRepository } from "../repositories/skill-category.repository";
import { StatusCodes } from "http-status-codes";
import { ApiError } from "../utils/api-error";
import { CreateSkillCategoryDto, UpdateSkillCategoryDto } from '../dto/skill-category.dto';
import activityService from './activity.service';
import { ACTIVITY_TYPES, RESOURCE_TYPES } from '../constants/activity-types';

export class SkillCategoryService {

  private repository =
    new SkillCategoryRepository();

  create(
    payload: CreateSkillCategoryDto,
    userId: string,
    userRole: string,
    companyId?: string,
    userData?: { fullName: string; email: string },
    ipAddress?: string,
    userAgent?: string
  ) {
    const createdType = userRole === "admin" ? "ADMIN" : "COMPANY";
    
    const category = this.repository.create({
      name: payload.name,
      description: payload.description,
      createdBy: userId,
      createdType,
      companyId: companyId
    } as any);

    // Log activity
    try {
      activityService.logActivity({
        userId,
        userName: userData?.fullName || 'Unknown',
        userEmail: userData?.email || '',
        userRole: userRole as 'admin' | 'company' | 'employee',
        actionType: ACTIVITY_TYPES.CREATE,
        resource: RESOURCE_TYPES.SKILL_CATEGORY,
        resourceId: (category as any)._id?.toString(),
        resourceName: payload.name,
        description: `Skill Category "${payload.name}" created${createdType === "COMPANY" ? " by company" : " by admin"}`,
        status: 'success',
        companyId,
        ipAddress: ipAddress || 'unknown',
        userAgent: userAgent || 'unknown',
        details: { createdType },
      }).catch(err => console.error('Error logging skill category creation activity:', err));
    } catch (err) {
      console.error('Error logging skill category creation activity:', err);
    }

    return category;
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
    companyId?: string,
    userData?: { fullName: string; email: string },
    ipAddress?: string,
    userAgent?: string
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

    const updated = await this.repository.update(id, payload);

    if (!updated) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Category not found');
    }

    // Log activity
    try {
      const updatedFields = Object.keys(payload).join(', ');
      activityService.logActivity({
        userId: userData?.fullName ? (updated as any).createdBy?.toString() : 'unknown',
        userName: userData?.fullName || 'Unknown',
        userEmail: userData?.email || '',
        userRole: (userRole || 'admin') as 'admin' | 'company' | 'employee',
        actionType: ACTIVITY_TYPES.UPDATE,
        resource: RESOURCE_TYPES.SKILL_CATEGORY,
        resourceId: id,
        resourceName: updated.name,
        description: `Skill Category "${updated.name}" updated (${updatedFields})`,
        status: 'success',
        companyId,
        ipAddress: ipAddress || 'unknown',
        userAgent: userAgent || 'unknown',
        details: { updatedFields: Object.keys(payload) },
      }).catch(err => console.error('Error logging skill category update activity:', err));
    } catch (err) {
      console.error('Error logging skill category update activity:', err);
    }

    return updated;
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