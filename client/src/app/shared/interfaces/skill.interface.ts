import { User } from './user.interface';
import { SkillCategory } from './skill-category.interface';

export interface Skill {

  _id: string;

  name: string;

  description?: string;

  categoryId: string | SkillCategory;

  createdBy: string | User;

  createdType: 'ADMIN' | 'COMPANY';

  companyId?: string;

  archived: boolean;

  status: 'active' | 'inactive';

  createdAt: string;

  updatedAt: string;

  // Legacy fields for backward compatibility
  cat_id?: SkillCategory;

  user_id?: User;

  skill_name?: string;

  skill_desc?: string;

  skill_level?: 1 | 2 | 3 | 4;

  skill_score?: number;

  created_at?: string;

}

export interface CreateSkill {

  cat_id?: string; // Legacy

  categoryId?: string;

  skill_name?: string; // Legacy

  name?: string;

  skill_desc?: string; // Legacy

  description?: string;

}

export interface SkillListResponse {

  skills: Skill[];

  pagination: {

    total: number;

    page: number;

    limit: number;

    totalPages: number;

  };

}