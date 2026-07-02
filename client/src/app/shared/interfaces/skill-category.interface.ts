export interface SkillCategory {
  _id: string;
  cat_name: string;
  cat_desc?: string;

  createdAt: string;
  updatedAt: string;
}

export interface CreateSkillCategory {
  cat_name: string;
  cat_desc?: string;
}

export interface UpdateSkillCategory {
  cat_name?: string;
  cat_desc?: string;
}