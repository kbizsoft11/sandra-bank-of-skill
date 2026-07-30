import { Schema } from 'mongoose';

export interface CreateCompanyCategoryDto {
  categoryId: string; // ObjectId as string
  // companyId is set by controller from authenticated user's organisation
}

export interface UpdateCompanyCategoryDto {
  enabled: boolean;
}

export interface CompanyCategoryResponseDto {
  _id: string;
  companyId: string;
  categoryId: string;
  categoryName: string; // Populated
  categoryDescription?: string; // Populated
  createdType: 'ADMIN' | 'COMPANY'; // From populated category
  enabled: boolean;
  skillsCount?: number; // Number of skills in this category
  createdAt: Date;
  updatedAt: Date;
}

export interface GetCompanyCategoriesQueryDto {
  page?: number;
  limit?: number;
  enabled?: boolean;
  createdType?: 'ADMIN' | 'COMPANY';
  search?: string;
}
