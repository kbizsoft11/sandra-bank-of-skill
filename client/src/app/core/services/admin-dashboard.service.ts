import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';

export interface DashboardStats {
  totalCompanies: number;
  totalEmployees: number;
  totalSkills: number;
  totalCategories: number;
  totalQuestionnaires: number;
  activeUsers: number;
  todayNewCompanies: number;
  todayNewEmployees: number;
  companiesGrowthPercentage: number;
  employeesGrowthPercentage: number;
}

export interface ChartData {
  companiesGrowth: any;
  employeesGrowth: any;
  skillsDistribution: any;
  topSkills: any;
  questionnaireCompletion: any;
  userRoles: any;
}

export interface Notification {
  _id: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'info' | 'error';
  isRead: boolean;
  createdAt: Date;
}

export interface Activity {
  _id: string;
  user: string;
  activity: string;
  type: string;
  createdAt: Date;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AdminDashboardService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${API_CONFIG.BASE_URL}/dashboard`;

  /**
   * Get dashboard overview statistics
   */
  getOverview(): Observable<ApiResponse<DashboardStats>> {
    return this.http.get<ApiResponse<DashboardStats>>(`${this.apiUrl}/admin/overview`);
  }

  /**
   * Get dashboard chart data
   */
  getChartData(month?: number, year?: number): Observable<ApiResponse<ChartData>> {
    let params = new HttpParams();
    if (month) {
      params = params.set('month', month.toString());
    }
    if (year) {
      params = params.set('year', year.toString());
    }
    return this.http.get<ApiResponse<ChartData>>(`${this.apiUrl}/admin/charts`, { params });
  }

  /**
   * Get notifications
   */
  getNotifications(
    filter: 'recent' | 'unread' | 'read' = 'recent',
    page: number = 1,
    limit: number = 10
  ): Observable<ApiResponse<{ notifications: Notification[]; pagination: any }>> {
    let params = new HttpParams()
      .set('filter', filter)
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.get<ApiResponse<{ notifications: Notification[]; pagination: any }>>(
      `${this.apiUrl}/admin/notifications`,
      { params }
    );
  }

  /**
   * Mark notification as read
   */
  markNotificationAsRead(notificationId: string): Observable<ApiResponse<void>> {
    return this.http.put<ApiResponse<void>>(
      `${this.apiUrl}/admin/notifications/${notificationId}/read`,
      {}
    );
  }

  /**
   * Mark notification as unread
   */
  markNotificationAsUnread(notificationId: string): Observable<ApiResponse<void>> {
    return this.http.put<ApiResponse<void>>(
      `${this.apiUrl}/admin/notifications/${notificationId}/unread`,
      {}
    );
  }

  /**
   * Get recent activities
   */
  getRecentActivities(page: number = 1, limit: number = 10): Observable<ApiResponse<{ activities: Activity[]; pagination: any }>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.get<ApiResponse<{ activities: Activity[]; pagination: any }>>(
      `${this.apiUrl}/admin/recent-activities`,
      { params }
    );
  }

  /**
   * Get dashboard stats
   */
  getStats(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/admin/stats`);
  }
}
