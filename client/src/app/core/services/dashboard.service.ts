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
}

export interface EmployeeStats {
  totalSkills: number;
  skillsByCategory: Array<{ _id: string; count: number }>;
  recentSkills: any[];
  assignedQuestionnaires: number;
  completedQuestionnaires: number;
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
}
