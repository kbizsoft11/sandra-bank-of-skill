import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';

export interface User {
  _id?: string;
  fullName: string;
  email: string;
  phone?: string;
  role: 'admin' | 'company' | 'employee';
  tenantId?: string;
  department?: string;
  location?: string;
  profileCompleted?: boolean;
  hasCompletedOnboarding?: boolean;
  emailVerified?: boolean;
  isActive: boolean;
  accountStatus: 'invited' | 'joined' | 'active' | 'suspended';
  lastLoginAt?: Date;
  createdAt?: Date;
  profileImage?: string;
  title?: string;
  organisationId?: string;
  designationId?: string;
}

export interface UsersListResponse {
  users: User[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AdminUsersService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${API_CONFIG.BASE_URL}/users`;

  /**
   * Get all users
   */
  getAllUsers(
    page: number = 1,
    limit: number = 20,
    search?: string,
    company?: string,
    role?: string,
    status?: string,
    sortBy?: string,
    sortOrder?: 'asc' | 'desc'
  ): Observable<ApiResponse<UsersListResponse>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (search) {
      params = params.set('search', search);
    }
    if (company) {
      params = params.set('company', company);
    }
    if (role) {
      params = params.set('role', role);
    }
    if (status) {
      params = params.set('status', status);
    }
    if (sortBy) {
      params = params.set('sortBy', sortBy);
    }
    if (sortOrder) {
      params = params.set('sortOrder', sortOrder);
    }

    return this.http.get<ApiResponse<UsersListResponse>>(this.apiUrl, { params });
  }

  /**
   * Get user by ID
   */
  getUserById(userId: string): Observable<ApiResponse<User>> {
    return this.http.get<ApiResponse<User>>(`${this.apiUrl}/${userId}`);
  }

  /**
   * Create a new user
   */
  createUser(userData: Partial<User>): Observable<ApiResponse<User>> {
    return this.http.post<ApiResponse<User>>(this.apiUrl, userData);
  }

  /**
   * Update user
   */
  updateUser(userId: string, userData: Partial<User>): Observable<ApiResponse<User>> {
    return this.http.put<ApiResponse<User>>(`${this.apiUrl}/${userId}`, userData);
  }

  /**
   * Delete user
   */
  deleteUser(userId: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${userId}`);
  }

  /**
   * Activate user
   */
  activateUser(userId: string): Observable<ApiResponse<User>> {
    return this.http.post<ApiResponse<User>>(`${this.apiUrl}/${userId}/activate`, {});
  }

  /**
   * Deactivate user
   */
  deactivateUser(userId: string): Observable<ApiResponse<User>> {
    return this.http.post<ApiResponse<User>>(`${this.apiUrl}/${userId}/deactivate`, {});
  }

  /**
   * Reset user password
   */
  resetPassword(userId: string): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.apiUrl}/${userId}/reset-password`, {});
  }

  /**
   * Impersonate user (admin only)
   */
  impersonateUser(userId: string): Observable<ApiResponse<{ token: string }>> {
    return this.http.post<ApiResponse<{ token: string }>>(`${this.apiUrl}/${userId}/impersonate`, {});
  }
}
