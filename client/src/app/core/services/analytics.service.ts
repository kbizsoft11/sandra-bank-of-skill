import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import { ApiResponse } from '../../shared/interfaces/api-response.interface';

export interface SkillCategoryAnalytics {
  totalSkillsPerCategory: Array<{
    _id: string;
    categoryName: string;
    skillCount: number;
  }>;
  employeesPerCategory: Array<{
    _id: string;
    categoryName: string;
    employeeCount: number;
    assignmentCount: number;
  }>;
  mostPopularCategories: Array<{
    categoryId: string;
    categoryName: string;
    employeeCount: number;
    assignmentCount: number;
    popularity: number;
  }>;
  categoryUsageReports: Array<{
    categoryId: string;
    categoryName: string;
    totalSkills: number;
    totalEmployeesUsing: number;
    totalAssignments: number;
    averageScore: number;
    levelBreakdown: {
      expert: number;
      advanced: number;
      intermediate: number;
      beginner: number;
    };
    adoptionRate: number;
  }>;
  categoryGrowth: Array<{
    _id: {
      category: string;
      categoryName: string;
      month: number;
      year: number;
    };
    count: number;
  }>;
  summary: {
    totalCategories: number;
    totalSkills: number;
    totalEmployeesWithSkills: number;
    averageEmployeesPerCategory: number;
  };
}

export interface CompanyAnalytics {
  summary: {
    totalCompanies: number;
    activeCompanies: number;
    inactiveCompanies: number;
    activePercentage: number;
    inactivePercentage: number;
    newCompaniesLast30Days: number;
    averageEmployeesPerCompany: number;
    totalEmployees: number;
    totalAdmins: number;
  };
  totalCompanies: number;
  activeCompanies: number;
  inactiveCompanies: number;
  newRegistrations: number;
  growthReport: Array<{
    _id: {
      year: number;
      month: number;
    };
    count: number;
    companyNames: string[];
  }>;
  activityReport: Array<{
    _id: string;
    name: string;
    status: boolean;
    createdAt: Date;
    employeeCount: number;
    adminCount: number;
    employeeCount_role: number;
  }>;
  usageReport: Array<{
    _id: string;
    name: string;
    status: boolean;
    createdAt: Date;
    totalEmployees: number;
    activeEmployees: number;
    totalSkillAssignments: number;
    registrationDate: Date;
    daysActive: number;
  }>;
  topCompanies: Array<{
    companyId: string;
    companyName: string;
    status: string;
    totalEmployees: number;
    admins: number;
    employees: number;
  }>;
  recentRegistrations: Array<{
    companyId: string;
    companyName: string;
    status: string;
    registeredDate: Date;
  }>;
  topSkillCategories: Array<{
    categoryName: string;
    usageCount: number;
    companiesCount: number;
  }>;
}

export interface EmployeeAnalytics {
  summary: {
    totalEmployees: number;
    activeEmployees: number;
    inactiveEmployees: number;
    activePercentage: number;
    inactivePercentage: number;
    newEmployeesLast30Days: number;
    totalCompanies: number;
    departmentCount: number;
    averageEmployeesPerCompany: number;
  };
  totalEmployees: number;
  activeEmployees: number;
  inactiveEmployees: number;
  employeesByCompany: Array<{
    _id: string;
    companyName: string;
    totalCount: number;
    activeCount: number;
    inactiveCount: number;
  }>;
  departmentWiseEmployees: Array<{
    _id: string;
    totalEmployees: number;
    activeEmployees: number;
    inactiveEmployees: number;
  }>;
  employeeGrowthReport: Array<{
    _id: {
      year: number;
      month: number;
    };
    count: number;
  }>;
  employeeActivityReport: Array<{
    _id: string;
    companyName: string;
    totalEmployees: number;
    activeEmployees: number;
    inactiveEmployees: number;
    avgDaysActive: number;
  }>;
  topDepartments: Array<{
    _id: string;
    totalEmployees: number;
    activeEmployees: number;
    inactiveEmployees: number;
  }>;
  newEmployeesLast30Days: number;
}

export interface SkillAnalytics {
  skillEmployeeCount: Array<{
    _id: string;
    skillName: string;
    categoryId: string;
    employeeCount: number;
    assignmentCount: number;
  }>;
  averageSkillLevel: Array<{
    _id: string;
    skillName: string;
    categoryId: string;
    avgScore: number;
    totalAssignments: number;
    experts: number;
    advanced: number;
    intermediate: number;
    beginner: number;
  }>;
  mostRequestedSkills: Array<{
    skillId: string;
    skillName: string;
    categoryId: string;
    employeeCount: number;
    assignmentCount: number;
    averageScore: number;
  }>;
  mostPopularSkills: Array<{
    skillId: string;
    skillName: string;
    categoryId: string;
    employeeCount: number;
    adoptionRate: number;
  }>;
  skillGrowthTrend: Array<{
    _id: {
      skillId: string;
      skillName: string;
      month: number;
      year: number;
    };
    count: number;
  }>;
  skillGapAnalysis: Array<{
    skillId: string;
    skillName: string;
    categoryId: string;
    averageScore: number;
    employeeCount: number;
    totalAssignments: number;
    levelBreakdown: {
      expert: number;
      advanced: number;
      intermediate: number;
      beginner: number;
    };
    recommendations: string;
    gapReason?: string;
  }>;
  skillReports: Array<{
    skillId: string;
    skillName: string;
    categoryName: string;
    categoryId: string;
    totalEmployeesWithSkill: number;
    totalAssignments: number;
    averageScore: number;
    adoptionRate: number;
    levelBreakdown: {
      expert: number;
      advanced: number;
      intermediate: number;
      beginner: number;
    };
  }>;
  summary: {
    totalSkills: number;
    skillsWithAssignments: number;
    skillsWithoutAssignments: number;
    totalEmployeesWithAnySkill: number;
    averageSkillsPerEmployee: number;
    highestScoredSkill: {
      skillName: string;
      score: number;
    } | null;
    lowestScoredSkill: {
      skillName: string;
      score: number;
    } | null;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private readonly http = inject(HttpClient);

  /**
   * Get company analytics
   */
  getCompanyAnalytics(startDate?: string, endDate?: string): Observable<ApiResponse<CompanyAnalytics>> {
    let url = `${API_CONFIG.BASE_URL}/analytics/companies`;
    
    if (startDate && endDate) {
      url += `?startDate=${startDate}&endDate=${endDate}`;
    }
    
    return this.http.get<ApiResponse<CompanyAnalytics>>(url);
  }

  /**
   * Get skill analytics
   */
  getSkillAnalytics(startDate?: string, endDate?: string): Observable<ApiResponse<SkillAnalytics>> {
    let url = `${API_CONFIG.BASE_URL}/analytics/skills`;
    
    if (startDate && endDate) {
      url += `?startDate=${startDate}&endDate=${endDate}`;
    }
    
    return this.http.get<ApiResponse<SkillAnalytics>>(url);
  }

  /**
   * Get skill category analytics
   */
  getSkillCategoryAnalytics(startDate?: string, endDate?: string): Observable<ApiResponse<SkillCategoryAnalytics>> {
    let url = `${API_CONFIG.BASE_URL}/analytics/skill-categories`;
    
    if (startDate && endDate) {
      url += `?startDate=${startDate}&endDate=${endDate}`;
    }
    
    return this.http.get<ApiResponse<SkillCategoryAnalytics>>(url);
  }

  /**
   * Get employee analytics
   */
  getEmployeeAnalytics(startDate?: string, endDate?: string): Observable<ApiResponse<EmployeeAnalytics>> {
    let url = `${API_CONFIG.BASE_URL}/analytics/employees`;
    
    if (startDate && endDate) {
      url += `?startDate=${startDate}&endDate=${endDate}`;
    }
    
    return this.http.get<ApiResponse<EmployeeAnalytics>>(url);
  }
}
