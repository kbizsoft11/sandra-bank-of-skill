export interface CreateSkillDto {
  cat_id: string;
  user_id: string;
  skill_name: string;
  skill_desc?: string;
  skill_level: string;
  skill_score?: number;
}

export interface UpdateSkillDto {
  cat_id?: string;
  user_id?: string;
  skill_name?: string;
  skill_desc?: string;
  skill_level?: string;
  skill_score?: number;
}

export interface GetSkillQueryDto {
  page?: number;
  limit?: number;
  search?: string;
  cat_id?: string;
  user_id?: string;
  skill_level?: string;
}