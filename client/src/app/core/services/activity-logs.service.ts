import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';

export interface ActivityLog {
  _id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: 'admin' | 'company' | 'employee';
  actionType: string;
  resource: string;
  resourceId?: string;
  resourceName?: string;
  description: string;
  status: 'success' | 'failure' | 'pending';
  companyId?: string;
  ipAddress?: string;
  userAgent?: string;
  changes?: Record<string, { old: any; new: any }>;
  details?: Record<string, any>;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLogsResponse {
  success: boolean;
  message: string;
  data: {
    activities: ActivityLog[];
    total: number;
    page: number;
    limit: number;
  };
}

export interface ActivityAnalyticsResponse {
  success: boolean;
  message: string;
  data: {
    totalActivities: number;
    activitiesByType: Array<{ _id: string; count: number }>;
    activitiesByResource: Array<{ _id: string; count: number }>;
    activitiesByStatus: Array<{ _id: string; count: number }>;
    activitiesByUserRole: Array<{ _id: string; count: number }>;
    topUsers: Array<{ _id: string; userName: string; userEmail: string; count: number }>;
  };
}

export interface ActivityLogsQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  actionType?: string;
  resource?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  userId?: string; // For admin filtering by specific user
  companyId?: string; // For admin filtering by specific company
  userRole?: string; // For admin filtering by role
}

@Injectable({
  providedIn: 'root',
})
export class ActivityLogsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_CONFIG.BASE_URL}/activities`;

  /**
   * Get all activities with optional filtering
   * Role-based filtering applied automatically on backend:
   * - Admin: sees all activities
   * - Company: sees only their company's activities
   * - Employee: sees only their own activities
   */
  getActivities(params?: ActivityLogsQueryParams): Observable<ActivityLogsResponse> {
    let httpParams = new HttpParams();

    if (params) {
      if (params.page) httpParams = httpParams.set('page', params.page.toString());
      if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());
      if (params.search) httpParams = httpParams.set('search', params.search);
      if (params.actionType && params.actionType !== 'all') {
        httpParams = httpParams.set('actionType', params.actionType);
      }
      if (params.resource && params.resource !== 'all') {
        httpParams = httpParams.set('resource', params.resource);
      }
      if (params.status && params.status !== 'all') {
        httpParams = httpParams.set('status', params.status);
      }
      if (params.startDate) httpParams = httpParams.set('startDate', params.startDate);
      if (params.endDate) httpParams = httpParams.set('endDate', params.endDate);
      if (params.userId) httpParams = httpParams.set('userId', params.userId);
      if (params.companyId) httpParams = httpParams.set('companyId', params.companyId);
      if (params.userRole && params.userRole !== 'all') {
        httpParams = httpParams.set('userRole', params.userRole);
      }
    }

    return this.http.get<ActivityLogsResponse>(this.baseUrl, { params: httpParams });
  }

  /**
   * Get single activity by ID
   */
  getActivityById(id: string): Observable<ActivityLogsResponse> {
    return this.http.get<ActivityLogsResponse>(`${this.baseUrl}/${id}`);
  }

  /**
   * Get activity analytics (summary statistics)
   * Admin: can view all organization analytics
   * Company: can view only their company analytics
   * Employee: cannot view analytics
   */
  getAnalytics(startDate?: string, endDate?: string): Observable<ActivityAnalyticsResponse> {
    let httpParams = new HttpParams();

    if (startDate) httpParams = httpParams.set('startDate', startDate);
    if (endDate) httpParams = httpParams.set('endDate', endDate);

    return this.http.get<ActivityAnalyticsResponse>(`${this.baseUrl}/analytics`, {
      params: httpParams,
    });
  }

  /**
   * Get activity type options for filter dropdown
   */
  getActivityTypeOptions(): string[] {
    return [
      'login',
      'logout',
      'password_reset',
      'email_verify',
      'account_activate',
      'account_deactivate',
      'create',
      'update',
      'delete',
      'assign',
      'unassign',
      'view',
      'export',
      'import',
      'bulk_action',
      'system_config',
    ];
  }

  /**
   * Get resource type options for filter dropdown
   */
  getResourceTypeOptions(): string[] {
    return ['user', 'company', 'skill', 'skill_category', 'course', 'assessment', 'questionnaire', 'document', 'document_requirement', 'system_settings'];
  }

  /**
   * Get status options for filter dropdown
   */
  getStatusOptions(): string[] {
    return ['success', 'failure', 'pending'];
  }

  /**
   * Get user role options for filter dropdown (admin only)
   */
  getUserRoleOptions(): string[] {
    return ['admin', 'company', 'employee'];
  }
}
