import { inject, Injectable } from '@angular/core';

import { HttpClient, HttpParams } from '@angular/common/http';

import { Observable } from 'rxjs';

import { API_CONFIG } from '../config/api.config';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private readonly http =
    inject(HttpClient);

  private readonly api =
    `${API_CONFIG.BASE_URL}/users`;

  getUsers(page: number = 1, limit: number = 100): Observable<any> {

    let httpParams = new HttpParams();
    httpParams = httpParams.set('page', page.toString());
    httpParams = httpParams.set('limit', limit.toString());

    return this.http.get(this.api, { params: httpParams });

  }

  getUserById(
    id: string
  ): Observable<any> {

    return this.http.get(
      `${this.api}/${id}`
    );

  }

  createUser(
    payload: any
  ): Observable<any> {

    return this.http.post(
      this.api,
      payload
    );

  }

  updateUser(
    id: string,
    payload: any
  ): Observable<any> {

    return this.http.put(
      `${this.api}/${id}`,
      payload
    );

  }

  deleteUser(
    id: string
  ): Observable<any> {

    return this.http.delete(
      `${this.api}/${id}`
    );

  }

  inviteUser(
    payload: { email: string; fullName?: string; role?: string; }
  ): Observable<any> {

    return this.http.post(
      `${this.api}/invite`,
      payload
    );

  }

  resetUserPassword(
    userId: string
  ): Observable<any> {

    return this.http.post(
      `${this.api}/${userId}/reset-password`,
      {}
    );

  }

  getMyProfile(): Observable<any> {

    return this.http.get(
      `${this.api}/me`
    );

  }

  updateMyProfile(
    payload: any
  ): Observable<any> {

    return this.http.put(
      `${this.api}/me`,
      payload
    );

  }

  uploadProfilePicture(
    file: File
  ): Observable<any> {

    const formData = new FormData();
    formData.append('profileImage', file);

    return this.http.post(
      `${this.api}/me/profile-picture`,
      formData
    );

  }

  uploadUserProfilePicture(
    userId: string,
    file: File
  ): Observable<any> {

    const formData = new FormData();
    formData.append('profileImage', file);

    return this.http.post(
      `${this.api}/${userId}/profile-picture`,
      formData
    );

  }

  setEmployeeStatus(
    userId: string,
    isActive: boolean
  ): Observable<any> {
    return this.http.patch(
      `${this.api}/${userId}/status`,
      { isActive }
    );
  }

  impersonateUser(
    userId: string
  ): Observable<any> {
    return this.http.post(
      `${this.api}/${userId}/impersonate`,
      {}
    );
  }

  impersonateCompanyUser(
    companyUserId: string
  ): Observable<any> {
    return this.http.post(
      `${this.api}/${companyUserId}/impersonate-as-company`,
      {}
    );
  }

  getEmployeesByCompany(
    companyId: string
  ): Observable<any> {

    return this.http.get(
      `${this.api}/company/${companyId}/employees`
    );

  }

  searchEmployees(params: {
    search?: string;
    skill?: string;
    category?: string;
    department?: string;
    team?: string;
    jobRole?: string;
    status?: string;
    accountStatus?: string;
    page?: number;
    limit?: number;
    sortKey?: string;
    sortDirection?: 'asc' | 'desc';
  }): Observable<any> {

    let httpParams = new HttpParams();

    if (params.search) {
      httpParams = httpParams.set('search', params.search);
    }
    if (params.skill) {
      httpParams = httpParams.set('skill', params.skill);
    }
    if (params.category) {
      httpParams = httpParams.set('category', params.category);
    }
    if (params.department) {
      httpParams = httpParams.set('department', params.department);
    }
    if (params.team) {
      httpParams = httpParams.set('team', params.team);
    }
    if (params.jobRole) {
      httpParams = httpParams.set('jobRole', params.jobRole);
    }
    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }
    if (params.accountStatus) {
      httpParams = httpParams.set('accountStatus', params.accountStatus);
    }
    if (params.page) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params.limit) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }
    if (params.sortKey) {
      httpParams = httpParams.set('sortKey', params.sortKey);
    }
    if (params.sortDirection) {
      httpParams = httpParams.set('sortDirection', params.sortDirection);
    }

    return this.http.get(
      `${this.api}/search/employees`,
      { params: httpParams }
    );

  }

  bulkUpdateEmployees(payload: {
    employeeIds: string[];
    updates: {
      department?: string;
      team?: string;
      jobRole?: string;
      status?: string;
    };
  }): Observable<any> {
    return this.http.patch(
      `${this.api}/bulk-update`,
      payload
    );
  }

  importEmployees(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post(
      `${this.api}/import`,
      formData
    );
  }

  exportEmployees(params?: {
    search?: string;
    department?: string;
    team?: string;
    jobRole?: string;
    status?: string;
    accountStatus?: string;
  }): Observable<Blob> {
    let httpParams = new HttpParams();

    if (params?.search) {
      httpParams = httpParams.set('search', params.search);
    }
    if (params?.department) {
      httpParams = httpParams.set('department', params.department);
    }
    if (params?.team) {
      httpParams = httpParams.set('team', params.team);
    }
    if (params?.jobRole) {
      httpParams = httpParams.set('jobRole', params.jobRole);
    }
    if (params?.status) {
      httpParams = httpParams.set('status', params.status);
    }

    return this.http.get(
      `${this.api}/export`,
      { params: httpParams, responseType: 'blob' }
    );
  }

  getEmployeeActivities(employeeId: string, type?: string): Observable<any> {
    let httpParams = new HttpParams();
    if (type) {
      httpParams = httpParams.set('type', type);
    }

    return this.http.get(
      `${this.api}/${employeeId}/activities`,
      { params: httpParams }
    );
  }

  getLoginHistory(employeeId: string, page: number = 1, limit: number = 10): Observable<any> {
    let httpParams = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.get(
      `${this.api}/${employeeId}/login-history`,
      { params: httpParams }
    );
  }

  getDepartments(): Observable<any> {
    return this.http.get(
      `${this.api}/departments`
    );
  }

  getTeams(): Observable<any> {
    return this.http.get(
      `${this.api}/teams`
    );
  }

  getJobRoles(): Observable<any> {
    return this.http.get(
      `${this.api}/job-roles`
    );
  }

  getCompanySkills(): Observable<any> {

    return this.http.get(
      `${this.api}/company-skills`
    );

  }

  getEmployeesBySkill(skillName: string): Observable<any> {
    return this.http.get(
      `${this.api}/company-skills/${encodeURIComponent(skillName)}/employees`
    );
  }

  getAllActivities(params: {
    page?: number;
    limit?: number;
    activityType?: string;
    employeeId?: string;
    status?: string;
    search?: string;
    dateRange?: string;
    startDate?: string;
    endDate?: string;
  }): Observable<any> {
    let httpParams = new HttpParams();

    if (params.page) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params.limit) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }
    if (params.activityType) {
      httpParams = httpParams.set('activityType', params.activityType);
    }
    if (params.employeeId) {
      httpParams = httpParams.set('employeeId', params.employeeId);
    }
    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }
    if (params.search) {
      httpParams = httpParams.set('search', params.search);
    }
    if (params.dateRange) {
      httpParams = httpParams.set('dateRange', params.dateRange);
    }
    if (params.startDate) {
      httpParams = httpParams.set('startDate', params.startDate);
    }
    if (params.endDate) {
      httpParams = httpParams.set('endDate', params.endDate);
    }

    return this.http.get(
      `${this.api}/all-activities`,
      { params: httpParams }
    );
  }
}