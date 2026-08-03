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

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private readonly http = inject(HttpClient);

  /**
   * Get skill category analytics
   */
  getSkillCategoryAnalytics(): Observable<ApiResponse<SkillCategoryAnalytics>> {
    return this.http.get<ApiResponse<SkillCategoryAnalytics>>(
      `${API_CONFIG.BASE_URL}/analytics/skill-categories`
    );
  }
}
