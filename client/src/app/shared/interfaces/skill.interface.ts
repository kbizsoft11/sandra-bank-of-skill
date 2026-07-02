import { User } from './user.interface';
import { SkillCategory } from './skill-category.interface';

export interface Skill {

  _id: string;

  cat_id: SkillCategory;

  user_id: User;

  skill_name: string;

  skill_desc?: string;

  skill_level: 1 | 2 | 3 | 4;

  skill_score?: number;

  created_at: string;

}

export interface CreateSkill {

  cat_id: string;

  user_id: string;

  skill_name: string;

  skill_desc?: string;

  skill_level: 1 | 2 | 3 | 4;

  skill_score?: number;

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