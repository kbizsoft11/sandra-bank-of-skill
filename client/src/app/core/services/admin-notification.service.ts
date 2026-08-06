import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import {
  AdminNotification,
  CreateAdminNotificationDto,
  UpdateAdminNotificationDto,
} from '../models/admin-notification.model';
import { ApiResponse } from '../models/api-response.model';

@Injectable({
  providedIn: 'root',
})
export class AdminNotificationService {
  private readonly http = inject(HttpClient);
  private readonly api = `${API_CONFIG.BASE_URL}/admin/notifications`;

  /**
   * Get all admin notifications with pagination and filtering
   */
  getAll(filters?: {
    status?: string;
    type?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Observable<ApiResponse<{ data: AdminNotification[]; pagination: any }>> {
    let params = new HttpParams();
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.type) params = params.set('type', filters.type);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.page) params = params.set('page', filters.page.toString());
    if (filters?.limit) params = params.set('limit', filters.limit.toString());

    return this.http.get<ApiResponse<{ data: AdminNotification[]; pagination: any }>>(this.api, { params });
  }

  /**
   * Get a single notification by ID
   */
  getById(id: string): Observable<ApiResponse<AdminNotification>> {
    return this.http.get<ApiResponse<AdminNotification>>(`${this.api}/${id}`);
  }

  /**
   * Create a new notification
   */
  create(payload: CreateAdminNotificationDto): Observable<ApiResponse<AdminNotification>> {
    return this.http.post<ApiResponse<AdminNotification>>(this.api, payload);
  }

  /**
   * Update a notification
   */
  update(id: string, payload: UpdateAdminNotificationDto): Observable<ApiResponse<AdminNotification>> {
    return this.http.put<ApiResponse<AdminNotification>>(`${this.api}/${id}`, payload);
  }

  /**
   * Delete a notification
   */
  delete(id: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.api}/${id}`);
  }

  /**
   * Schedule a notification for later delivery
   */
  schedule(id: string, scheduledAt: string): Observable<ApiResponse<AdminNotification>> {
    return this.http.post<ApiResponse<AdminNotification>>(`${this.api}/${id}/schedule`, { scheduledAt });
  }

  /**
   * Cancel a scheduled notification
   */
  cancel(id: string): Observable<ApiResponse<AdminNotification>> {
    return this.http.post<ApiResponse<AdminNotification>>(`${this.api}/${id}/cancel`, {});
  }
}
