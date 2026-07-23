import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import {
    CompanyNotification,
    CreateCompanyNotificationDto,
    UpdateCompanyNotificationDto,
} from '../models/company-notification.model';
import { ApiResponse } from '../models/api-response.model';

@Injectable({
    providedIn: 'root',
})
export class CompanyNotificationService {
    private readonly http = inject(HttpClient);
    private readonly api = `${API_CONFIG.BASE_URL}/company-notifications`;

    getAll(filters?: { status?: string; type?: string; search?: string }): Observable<ApiResponse<CompanyNotification[]>> {
        let params = new HttpParams();
        if (filters?.status) params = params.set('status', filters.status);
        if (filters?.type) params = params.set('type', filters.type);
        if (filters?.search) params = params.set('search', filters.search);

        return this.http.get<ApiResponse<CompanyNotification[]>>(this.api, { params });
    }

    getById(id: string): Observable<ApiResponse<CompanyNotification>> {
        return this.http.get<ApiResponse<CompanyNotification>>(`${this.api}/${id}`);
    }

    create(payload: CreateCompanyNotificationDto): Observable<ApiResponse<CompanyNotification>> {
        return this.http.post<ApiResponse<CompanyNotification>>(this.api, payload);
    }

    update(id: string, payload: UpdateCompanyNotificationDto): Observable<ApiResponse<CompanyNotification>> {
        return this.http.put<ApiResponse<CompanyNotification>>(`${this.api}/${id}`, payload);
    }

    delete(id: string): Observable<ApiResponse<null>> {
        return this.http.delete<ApiResponse<null>>(`${this.api}/${id}`);
    }

    schedule(id: string, scheduledAt: string): Observable<ApiResponse<CompanyNotification>> {
        return this.http.post<ApiResponse<CompanyNotification>>(`${this.api}/${id}/schedule`, { scheduledAt });
    }

    cancel(id: string): Observable<ApiResponse<CompanyNotification>> {
        return this.http.post<ApiResponse<CompanyNotification>>(`${this.api}/${id}/cancel`, {});
    }
}
