export interface CreateSkillCategoryDto {
  name: string;
  description?: string;
  createdBy?: string; // Set by service
  createdType?: string; // Set by service (ADMIN or COMPANY)
  companyId?: string; // Set by service for COMPANY role
}

export interface UpdateSkillCategoryDto {
  name?: string;
  description?: string;
}