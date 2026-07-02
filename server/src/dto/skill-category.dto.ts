export interface CreateSkillCategoryDto {
  cat_name: string;
  cat_desc?: string;
}

export interface UpdateSkillCategoryDto {
  cat_name?: string;
  cat_desc?: string;
}