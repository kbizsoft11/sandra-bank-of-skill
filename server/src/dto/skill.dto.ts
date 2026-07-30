import { Schema } from 'mongoose';

export type CreatedType = 'ADMIN' | 'COMPANY';

export interface CreateSkillDto {
  name: string;
  description?: string;
  categoryId: string; // ObjectId as string
  // createdBy and createdType are set by the controller based on authenticated user
  // companyId is set by controller for COMPANY role
}

export interface UpdateSkillDto {
  name?: string;
  description?: string;
  categoryId?: string;
  status?: 'active' | 'inactive';
  // Only company can update their own skills
  // Admin can update any skill
}

export interface ArchiveSkillDto {
  archived: boolean;
}

export interface SkillResponseDto {
  _id: string;
  name: string;
  description?: string;
  categoryId: string;
  categoryName?: string; // Populated
  createdBy: string; // User name
  createdType: CreatedType;
  companyId?: string; // Company name or null
  archived: boolean;
  status: 'active' | 'inactive';
  usedByEmployeesCount?: number; // Number of employees with this skill
  companiesUsingCount?: number; // Number of companies using this skill (if admin created)
  createdAt: Date;
  updatedAt: Date;
}

export interface GetSkillsQueryDto {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  status?: 'active' | 'inactive';
  createdType?: CreatedType;
  archived?: boolean;
}
