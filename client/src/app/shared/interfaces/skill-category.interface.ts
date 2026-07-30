// ===== NEW NORMALIZED SCHEMA =====

export interface SkillCategory {
  _id: string;
  name: string;
  description?: string;
  createdBy: string; // User ID
  createdType: 'ADMIN' | 'COMPANY'; // Owner type
  companyId?: string | null; // Only for company-owned categories
  archived: boolean;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
  
  // Populated fields (from service)
  createdByUser?: {
    _id: string;
    fullName: string;
    email: string;
  };
  company?: {
    _id: string;
    company_name: string;
  };
}

export interface CreateSkillCategory {
  name: string;
  description?: string;
  createdType?: 'ADMIN' | 'COMPANY'; // Defaults to ADMIN
}

export interface UpdateSkillCategory {
  name?: string;
  description?: string;
  status?: 'active' | 'inactive';
}

// ===== LEGACY SCHEMA (for migration compatibility) =====

export interface SkillCategoryLegacy {
  _id: string;
  cat_name: string;
  cat_desc?: string;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSkillCategoryLegacy {
  cat_name: string;
  cat_desc?: string;
}

export interface CompanySkillCategoryMapping {
  _id?: string;  // MongoDB ID
  categoryId: string;
  skillCategoryId?: string;
  originalName: string;
  displayName: string;
  companyId?: string;
  mappingId?: string;  // Alias for _id for backward compatibility
}

export interface CreateCompanySkillCategory {
  skillCategoryId: string;
  displayName: string;
}

export interface UpdateCompanySkillCategory {
  displayName?: string;
}