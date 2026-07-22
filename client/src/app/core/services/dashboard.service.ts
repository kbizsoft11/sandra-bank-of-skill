import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_CONFIG } from '../config/api.config';
import { ApiResponse } from '../../shared/interfaces/api-response.interface';

export interface AdminStats {
  totalUsers: number;
  totalCompanies: number;
  totalEmployees: number;
  totalSkills: number;
  totalCategories: number;
  totalQuestionnaires: number;
  activeUsers: number;
  recentUsers: any[];
  skillsByCategory: Array<{ _id: string; count: number }>;
}

export interface CompanyStats {
  totalEmployees: number;
  activeEmployees: number;
  totalQuestionnaires: number;
  totalSkills: number;
  invitedEmployees: number;
  recentEmployees: any[];
  topEmployees: Array<{
    _id: string;
    fullName: string;
    department?: string;
    location?: string;
    skillCount: number;
  }>;
  topSkills: Array<{
    skillName: string;
    employeeCount: number;
  }>;
}

export interface EmployeeStats {
  totalSkills: number;
  skillsByCategory: Array<{ _id: string; count: number }>;
  recentSkills: any[];
  assignedQuestionnaires: number;
  completedQuestionnaires: number;
  neverCompleted?: number;
  averageSkillLevel?: number;
  averageInterestLevel?: number;
  skillPoints?: number;
  topCategories?: Array<{
    _id: string;
    count: number;
    averageLevel: number;
    levels?: { [key: string]: number };
  }>;
  topSkills?: Array<{
    _id: string;
    skillName: string;
    skillLevel: number;
  }>;
  topInterests?: Array<{
    _id: string;
    skillName: string;
    interestLevel: number;
  }>;
  similarPeople?: Array<{
    _id: string;
    fullName: string;
    commonSkills: number;
  }>;
  improveSkills?: Array<{
    _id: string;
    skillName: string;
  }>;
}

export interface CompanyAbout {
  firstName: string;
  surname: string;
  email: string;
  role: string;
  skillSet: string;
  securityGroup: string;
  supervises: string;
  supervisors: string;
  lastLoginAt: string | null;
  accountType: string;
  createdAt: string | null;
  fullName: string;
}

export interface AssessmentHistoryItem {
  completionDate: string;
  type: string;
  skillSet: string;
  categories: number;
  skills: number;
  overallComments: string;
  completedBy: string;
  completedById: string;
}

export interface CompanyAssessments {
  selfAssessment: {
    lastCompletedAt: string | null;
  };
  supervisorAssessment: {
    lastCompletedAt: string | null;
  };
  history: AssessmentHistoryItem[];
  pagination: {
    page: number;
    limit: number;
    totalRecords: number;
    totalPages: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private readonly http = inject(HttpClient);

  /**
   * Get admin dashboard statistics
   */
  getAdminStats(): Observable<ApiResponse<AdminStats>> {
    return this.http.get<ApiResponse<AdminStats>>(
      `${API_CONFIG.BASE_URL}/dashboard/admin/stats`
    );
  }

  /**
   * Get company dashboard statistics
   */
  getCompanyStats(): Observable<ApiResponse<CompanyStats>> {
    return this.http.get<ApiResponse<CompanyStats>>(
      `${API_CONFIG.BASE_URL}/dashboard/company/stats`
    );
  }

  /**
   * Get employee dashboard statistics
   */
  getEmployeeStats(): Observable<ApiResponse<EmployeeStats>> {
    return this.http.get<ApiResponse<EmployeeStats>>(
      `${API_CONFIG.BASE_URL}/dashboard/employee/stats`
    );
  }

  /**
   * Get company dashboard about tab data
   */
  getCompanyAbout(): Observable<ApiResponse<CompanyAbout>> {
    return this.http.get<ApiResponse<CompanyAbout>>(
      `${API_CONFIG.BASE_URL}/dashboard/company/about`
    );
  }

  /**
   * Get company dashboard assessments tab data
   */
  getCompanyAssessments(page = 1, limit = 10): Observable<ApiResponse<CompanyAssessments>> {
    return this.http.get<ApiResponse<CompanyAssessments>>(
      `${API_CONFIG.BASE_URL}/dashboard/company/assessments`,
      { params: { page: page.toString(), limit: limit.toString() } }
    );
  }
}
