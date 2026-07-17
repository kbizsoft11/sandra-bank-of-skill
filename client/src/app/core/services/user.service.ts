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

  getUsers(): Observable<any> {

    return this.http.get(this.api);

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
    page?: number;
    limit?: number;
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
    if (params.page) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params.limit) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }

    return this.http.get(
      `${this.api}/search/employees`,
      { params: httpParams }
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

}