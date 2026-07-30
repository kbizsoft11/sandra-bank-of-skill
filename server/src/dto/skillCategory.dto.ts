import { Schema } from 'mongoose';

export type CreatedType = 'ADMIN' | 'COMPANY';

export interface CreateSkillCategoryDto {
  name: string;
  description?: string;
  // createdBy and createdType are set by the controller based on authenticated user
  // companyId is set by controller for COMPANY role
}

export interface UpdateSkillCategoryDto {
  name?: string;
  description?: string;
  status?: 'active' | 'inactive';
  // Only company can update their own categories
  // Admin can update any category
}

export interface ArchiveSkillCategoryDto {
  archived: boolean;
}

export interface SkillCategoryResponseDto {
  _id: string;
  name: string;
  description?: string;
  createdBy: string; // User name
  createdType: CreatedType;
  companyId?: string; // Company name or null
  archived: boolean;
  status: 'active' | 'inactive';
  skillsCount?: number; // Number of skills in this category
  companiesUsingCount?: number; // Number of companies using this category (if admin created)
  createdAt: Date;
  updatedAt: Date;
}

export interface GetSkillCategoriesQueryDto {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive';
  createdType?: CreatedType;
  archived?: boolean;
}
