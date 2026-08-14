import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_CONFIG } from '../config/api.config';
import { ApiResponse } from '../../shared/interfaces/api-response.interface';
import { AuthService } from './auth.service';

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
  recentActivities: Array<{
    _id?: string;
    employeeName: string;
    activity: string;
    timestamp: string;
  }>;
}

export interface EmployeeStats {
  employeeProfile?: {
    fullName: string;
    title: string;
    department: string;
    location: string;
    profileCompletion: number;
  };
  summary?: {
    totalSkills: number;
    verifiedSkills: number;
    skillsInProgress: number;
    profileCompletion: number;
    averageSkillLevel: number;
    averageInterestLevel: number;
    skillPoints: number;
  };
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
    currentLevel: string;
    targetLevel: string;
    progress: number;
    verificationStatus: string;
    skillScore: number;
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
  mySkills?: Array<{
    _id: string;
    skillName: string;
    currentLevel: string;
    targetLevel: string;
    progress: number;
    verificationStatus: string;
    skillScore: number;
  }>;
  skillGaps?: Array<{
    _id: string;
    skillName: string;
    currentLevel: string;
    targetLevel: string;
    progress: number;
  }>;
  pendingActions?: Array<{
    title: string;
    description: string;
    status: string;
    dueDate?: string;
    actionLabel: string;
  }>;
  recentActivities?: Array<{
    type: string;
    title: string;
    description: string;
    time: string;
    icon: string;
  }>;
  learningRecommendations?: Array<{
    title: string;
    relatedSkill: string;
    duration: string;
    type: string;
  }>;
  careerGrowth?: {
    currentRole: string;
    potentialNextRole: string;
    readiness: number;
    requiredSkills: Array<{
      name: string;
      status: string;
    }>;
  };
}

export interface EmployeeNotification {
  _id?: string;
  notificationId?: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'info' | 'error';
  isRead: boolean;
  createdAt?: string;
  updatedAt?: string;
  relatedTo?: string;
  relatedId?: string;
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
  private readonly auth = inject(AuthService);

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
   * Get employee notifications
   */
  getEmployeeNotifications(filter: 'recent' | 'unread' | 'read' = 'recent', page = 1, limit = 5): Observable<ApiResponse<{ notifications: EmployeeNotification[]; pagination: any }>> {
    return this.http.get<ApiResponse<{ notifications: EmployeeNotification[]; pagination: any }>>(
      `${API_CONFIG.BASE_URL}/dashboard/employee/notifications`,
      { params: { filter, page: page.toString(), limit: limit.toString() } }
    );
  }

  /**
   * Get company notifications (for companies receiving admin notifications)
   */
  getCompanyNotifications(filter: 'recent' | 'unread' | 'read' = 'recent', page = 1, limit = 5): Observable<ApiResponse<{ notifications: EmployeeNotification[]; pagination: any }>> {
    return this.http.get<ApiResponse<{ notifications: EmployeeNotification[]; pagination: any }>>(
      `${API_CONFIG.BASE_URL}/dashboard/company/notifications`,
      { params: { filter, page: page.toString(), limit: limit.toString() } }
    );
  }

  /**
   * Mark employee notification as read
   */
  markEmployeeNotificationAsRead(notificationId: string): Observable<ApiResponse<void>> {
    return this.http.put<ApiResponse<void>>(
      `${API_CONFIG.BASE_URL}/dashboard/employee/notifications/${notificationId}/read`,
      {}
    );
  }

  /**
   * Mark employee notification as unread
   */
  markEmployeeNotificationAsUnread(notificationId: string): Observable<ApiResponse<void>> {
    return this.http.put<ApiResponse<void>>(
      `${API_CONFIG.BASE_URL}/dashboard/employee/notifications/${notificationId}/unread`,
      {}
    );
  }

  /**
   * Mark company notification as read
   */
  markCompanyNotificationAsRead(notificationId: string): Observable<ApiResponse<void>> {
    return this.http.put<ApiResponse<void>>(
      `${API_CONFIG.BASE_URL}/dashboard/company/notifications/${notificationId}/read`,
      {}
    );
  }

  /**
   * Mark company notification as unread
   */
  markCompanyNotificationAsUnread(notificationId: string): Observable<ApiResponse<void>> {
    return this.http.put<ApiResponse<void>>(
      `${API_CONFIG.BASE_URL}/dashboard/company/notifications/${notificationId}/unread`,
      {}
    );
  }

  /**
   * SCALABLE NOTIFICATION ENDPOINTS (for 100k+ users)
   */

  /**
   * Get employee notifications (scalable - uses read receipts)
   */
  getEmployeeNotificationsScalable(filter: 'recent' | 'unread' | 'read' = 'recent', page = 1, limit = 5): Observable<ApiResponse<{ notifications: EmployeeNotification[]; pagination: any }>> {
    return this.http.get<ApiResponse<{ notifications: EmployeeNotification[]; pagination: any }>>(
      `${API_CONFIG.BASE_URL}/scalable-notifications/employee/notifications`,
      { params: { filter, page: page.toString(), limit: limit.toString() } }
    );
  }

  /**
   * Get company notifications (scalable - uses read receipts)
   */
  getCompanyNotificationsScalable(filter: 'recent' | 'unread' | 'read' = 'recent', page = 1, limit = 5): Observable<ApiResponse<{ notifications: EmployeeNotification[]; pagination: any }>> {
    return this.http.get<ApiResponse<{ notifications: EmployeeNotification[]; pagination: any }>>(
      `${API_CONFIG.BASE_URL}/scalable-notifications/company/notifications`,
      { params: { filter, page: page.toString(), limit: limit.toString() } }
    );
  }

  /**
   * Mark employee notification as read (scalable)
   */
  markEmployeeNotificationAsReadScalable(notificationId: string): Observable<ApiResponse<void>> {
    return this.http.put<ApiResponse<void>>(
      `${API_CONFIG.BASE_URL}/scalable-notifications/employee/notifications/${notificationId}/read`,
      {}
    );
  }

  /**
   * Mark employee notification as unread (scalable)
   */
  markEmployeeNotificationAsUnreadScalable(notificationId: string): Observable<ApiResponse<void>> {
    return this.http.put<ApiResponse<void>>(
      `${API_CONFIG.BASE_URL}/scalable-notifications/employee/notifications/${notificationId}/unread`,
      {}
    );
  }

  /**
   * Mark company notification as read (scalable)
   */
  markCompanyNotificationAsReadScalable(notificationId: string): Observable<ApiResponse<void>> {
    return this.http.put<ApiResponse<void>>(
      `${API_CONFIG.BASE_URL}/scalable-notifications/company/notifications/${notificationId}/read`,
      {}
    );
  }

  /**
   * Mark company notification as unread (scalable)
   */
  markCompanyNotificationAsUnreadScalable(notificationId: string): Observable<ApiResponse<void>> {
    return this.http.put<ApiResponse<void>>(
      `${API_CONFIG.BASE_URL}/scalable-notifications/company/notifications/${notificationId}/unread`,
      {}
    );
  }

  /**
   * Get unread notification count (scalable)
   */
  getUnreadNotificationCountScalable(): Observable<ApiResponse<{ unreadCount: number }>> {
    const role = this.auth.role();
    const endpoint = role === 'company' ? 'company' : 'employee';
    return this.http.get<ApiResponse<{ unreadCount: number }>>(
      `${API_CONFIG.BASE_URL}/scalable-notifications/${endpoint}/unread-count`
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

  /**
   * Get support tickets for the current user/company
   */
  getSupportTickets(page = 1, limit = 10): Observable<ApiResponse<{ tickets: any[]; pagination: any }>> {
    return this.http.get<ApiResponse<{ tickets: any[]; pagination: any }>>(
      `${API_CONFIG.BASE_URL}/support-tickets`,
      { params: { page: page.toString(), limit: limit.toString() } }
    );
  }

  /**
   * Create a new support ticket
   */
  createSupportTicket(payload: { subject: string; description: string; category?: string; priority?: 'low' | 'normal' | 'high' }): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${API_CONFIG.BASE_URL}/support-tickets`, payload);
  }

  /**
   * Update support ticket status (admin/company only)
   */
  updateSupportTicketStatus(ticketId: string, status: 'open' | 'pending' | 'resolved' | 'closed', note?: string): Observable<ApiResponse<any>> {
    return this.http.patch<ApiResponse<any>>(`${API_CONFIG.BASE_URL}/support-tickets/${ticketId}/status`, { status, note });
  }
}
