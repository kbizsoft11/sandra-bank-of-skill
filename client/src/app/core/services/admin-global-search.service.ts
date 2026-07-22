import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';

export interface DashboardSummary {
  totalCompanies: number;
  totalEmployees: number;
  totalUsers: number;
  totalSkills: number;
  totalCategories: number;
  totalQuestionnaires: number;
  totalAssessments: number;
}

export interface CompanyResult {
  _id: string;
  fullName: string;
  email: string;
  tenantId: string;
  createdAt: Date;
  isActive: boolean;
  accountStatus: string;
}

export interface EmployeeResult {
  _id: string;
  fullName: string;
  email: string;
  department?: string;
  'organisation.organisationName'?: string;
  skillCount: number;
  isActive: boolean;
  accountStatus: string;
  createdAt: Date;
}

export interface UserResult {
  _id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
  accountStatus: string;
  createdAt: Date;
}

export interface SearchResults {
  companies?: CompanyResult[];
  employees?: EmployeeResult[];
}

export interface SearchPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  counts: {
    companies?: number;
    employees?: number;
    users?: number;
    skills?: number;
    skill_categories?: number;
    questionnaires?: number;
  };
}

export interface GlobalSearchResponse {
  success: boolean;
  data: {
    results: SearchResults;
    pagination: SearchPagination;
  };
  message?: string;
}

export interface DashboardSummaryResponse {
  success: boolean;
  data: DashboardSummary;
  message?: string;
}

export type EntityType = 'all' | 'companies' | 'employees';
export type StatusType = 'active' | 'inactive' | 'pending' | 'verified' | 'unverified';
export type SortOrder = 'asc' | 'desc';

@Injectable({
  providedIn: 'root',
})
export class AdminGlobalSearchService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${API_CONFIG.BASE_URL}/admin/global-search`;

  /**
   * Get dashboard summary for current month
   */
  getDashboardSummary(): Observable<DashboardSummaryResponse> {
    return this.http.get<DashboardSummaryResponse>(`${this.apiUrl}/dashboard`);
  }

  /**
   * Perform global search across all entities
   */
  globalSearch(params: {
    search?: string;
    entity?: EntityType;
    status?: StatusType;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: SortOrder;
  }): Observable<GlobalSearchResponse> {
    let httpParams = new HttpParams();

    if (params.search) {
      httpParams = httpParams.set('search', params.search);
    }
    if (params.entity) {
      httpParams = httpParams.set('entity', params.entity);
    }
    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }
    if (params.startDate) {
      httpParams = httpParams.set('startDate', params.startDate);
    }
    if (params.endDate) {
      httpParams = httpParams.set('endDate', params.endDate);
    }
    if (params.page) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params.limit) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }
    if (params.sortBy) {
      httpParams = httpParams.set('sortBy', params.sortBy);
    }
    if (params.sortOrder) {
      httpParams = httpParams.set('sortOrder', params.sortOrder);
    }

    return this.http.get<GlobalSearchResponse>(`${this.apiUrl}`, { params: httpParams });
  }
}
