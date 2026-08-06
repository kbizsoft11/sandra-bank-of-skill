/**
 * Assessment Service
 */

import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { API_CONFIG } from '../config/api.config';
import { ApiResponse } from '../../shared/interfaces/api-response.interface';
import {
  AssessmentStatus,
  AssessmentReport,
  AssessmentMap,
  CreateAssessmentPayload,
  CreateAssessmentResponse,
  UnlockAssessmentResponse,
  OrganisationAssessments,
  MyAssessmentItem,
  AdminPrismReportsResponse,
} from '../../shared/interfaces/assessment.interface';

@Injectable({
  providedIn: 'root',
})
export class AssessmentService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${API_CONFIG.BASE_URL}/assessments`;

  assessmentStatus = signal<AssessmentStatus | null>(null);
  assessmentReport = signal<AssessmentReport | null>(null);
  organisationAssessments = signal<OrganisationAssessments | null>(null);
  myAssessments = signal<MyAssessmentItem[]>([]);
  assessmentLoading = signal<boolean>(false);
  assessmentError = signal<string | null>(null);

  createAssessment(employeeId: string, qTypeId?: number): Observable<ApiResponse<CreateAssessmentResponse>> {
    this.assessmentLoading.set(true);
    this.assessmentError.set(null);

    const payload: CreateAssessmentPayload = { employeeId, qTypeId };

    return this.http.post<ApiResponse<CreateAssessmentResponse>>(this.apiUrl, payload).pipe(
      tap({
        next: (response) => {
          this.assessmentLoading.set(false);
          console.log('✅ Assessment created:', response.data);
        },
        error: (error) => {
          this.assessmentLoading.set(false);
          this.assessmentError.set(error.error?.message || 'Failed to create assessment');
          console.error('❌ Error creating assessment:', error);
        },
      })
    );
  }

  getAssessmentStatus(employeeId: string, forceRefresh: boolean = false): Observable<ApiResponse<AssessmentStatus>> {
    this.assessmentLoading.set(true);
    this.assessmentError.set(null);

    let params = new HttpParams();
    if (forceRefresh) {
      params = params.set('refresh', 'true');
    }

    return this.http.get<ApiResponse<AssessmentStatus>>(`${this.apiUrl}/${employeeId}/status`, { params }).pipe(
      tap({
        next: (response) => {
          this.assessmentLoading.set(false);
          this.assessmentStatus.set(response.data);
          console.log('✅ Assessment status retrieved:', response.data);
        },
        error: (error) => {
          this.assessmentLoading.set(false);
          this.assessmentError.set(error.error?.message || 'Failed to get assessment status');
          console.error('❌ Error getting assessment status:', error);
        },
      })
    );
  }

  getAssessmentReport(
    employeeId: string,
    entityTypeId?: number,
    onetCode?: string
  ): Observable<ApiResponse<AssessmentReport>> {
    this.assessmentLoading.set(true);
    this.assessmentError.set(null);

    let params = new HttpParams();
    if (entityTypeId !== undefined) {
      params = params.set('entityTypeId', entityTypeId.toString());
    }
    if (onetCode) {
      params = params.set('onetCode', onetCode);
    }

    return this.http.get<ApiResponse<AssessmentReport>>(`${this.apiUrl}/${employeeId}/report`, { params }).pipe(
      tap({
        next: (response) => {
          this.assessmentLoading.set(false);
          this.assessmentReport.set(response.data);
          console.log('✅ Assessment report retrieved:', response.data);
        },
        error: (error) => {
          this.assessmentLoading.set(false);
          this.assessmentError.set(error.error?.message || 'Failed to get assessment report');
          console.error('❌ Error getting assessment report:', error);
        },
      })
    );
  }

  getAssessmentMap(employeeId: string, mapType: 'basic' | 'full' = 'basic'): Observable<ApiResponse<AssessmentMap>> {
    this.assessmentLoading.set(true);
    this.assessmentError.set(null);

    const params = new HttpParams().set('type', mapType);

    return this.http.get<ApiResponse<AssessmentMap>>(`${this.apiUrl}/${employeeId}/map`, { params }).pipe(
      tap({
        next: (response) => {
          this.assessmentLoading.set(false);
          console.log('✅ Assessment map retrieved:', response.data);
        },
        error: (error) => {
          this.assessmentLoading.set(false);
          this.assessmentError.set(error.error?.message || 'Failed to get assessment map');
          console.error('❌ Error getting assessment map:', error);
        },
      })
    );
  }

  unlockAssessmentReport(employeeId: string): Observable<ApiResponse<UnlockAssessmentResponse>> {
    this.assessmentLoading.set(true);
    this.assessmentError.set(null);

    return this.http.post<ApiResponse<UnlockAssessmentResponse>>(`${this.apiUrl}/${employeeId}/unlock`, {}).pipe(
      tap({
        next: (response) => {
          this.assessmentLoading.set(false);
          console.log('✅ Assessment report unlocked:', response.data);

          if (this.assessmentStatus()) {
            this.assessmentStatus.update((status) =>
              status ? { ...status, questStatus: 6, questStatusLabel: 'Report Available' } : null
            );
          }
        },
        error: (error) => {
          this.assessmentLoading.set(false);
          this.assessmentError.set(error.error?.message || 'Failed to unlock assessment report');
          console.error('❌ Error unlocking assessment report:', error);
        },
      })
    );
  }

  getOrganisationAssessments(organisationId: string): Observable<ApiResponse<OrganisationAssessments>> {
    this.assessmentLoading.set(true);
    this.assessmentError.set(null);

    const params = new HttpParams().set('_refresh', Date.now().toString());

    return this.http.get<ApiResponse<OrganisationAssessments>>(`${this.apiUrl}/organisation/${organisationId}/employees`, { params }).pipe(
      tap({
        next: (response) => {
          this.assessmentLoading.set(false);
          this.organisationAssessments.set(response.data);
          console.log('✅ Organisation assessments retrieved:', response.data);
        },
        error: (error) => {
          this.assessmentLoading.set(false);
          this.assessmentError.set(error.error?.message || 'Failed to get organisation assessments');
          console.error('❌ Error getting organisation assessments:', error);
        },
      })
    );
  }

  fetchMyAssessments(): Observable<ApiResponse<{ assessments: MyAssessmentItem[] }>> {
    this.assessmentLoading.set(true);
    this.assessmentError.set(null);

    const params = new HttpParams().set('_refresh', Date.now().toString());

    return this.http.get<ApiResponse<{ assessments: MyAssessmentItem[] }>>(`${this.apiUrl}/my-assessments`, { params }).pipe(
      tap({
        next: (response) => {
          this.assessmentLoading.set(false);
          this.myAssessments.set(response.data.assessments);
          console.log('✅ My assessments retrieved:', response.data.assessments);
        },
        error: (error) => {
          this.assessmentLoading.set(false);
          this.assessmentError.set(error.error?.message || 'Failed to get my assessments');
          console.error('❌ Error getting my assessments:', error);
        },
      })
    );
  }

  getAdminPrismReports(params: {
    page?: number;
    limit?: number;
    search?: string;
    organisationId?: string;
    status?: string;
  } = {}): Observable<ApiResponse<AdminPrismReportsResponse>> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    });
    return this.http.get<ApiResponse<AdminPrismReportsResponse>>(`${this.apiUrl}/admin/reports`, { params: httpParams });
  }

  clearError(): void {
    this.assessmentError.set(null);
  }

  clearState(): void {
    this.assessmentStatus.set(null);
    this.assessmentReport.set(null);
    this.organisationAssessments.set(null);
    this.assessmentError.set(null);
    this.assessmentLoading.set(false);
  }

  hasAssessment(status: AssessmentStatus | null): boolean {
    return status !== null && status.questStatus !== 1;
  }

  isAssessmentUnlocked(status: AssessmentStatus | null): boolean {
    return status !== null && status.questStatus === 6;
  }

  canUnlockAssessment(status: AssessmentStatus | null): boolean {
    return status !== null && (status.questStatus === 3 || status.questStatus === 4);
  }

  canTakeAssessment(status: AssessmentStatus | null): boolean {
    return status !== null && status.questStatus === 2 && !!status.questionnaire?.actionUrl;
  }
}
