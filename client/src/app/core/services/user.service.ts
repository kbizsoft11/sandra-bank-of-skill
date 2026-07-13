import { inject, Injectable } from '@angular/core';

import { HttpClient } from '@angular/common/http';

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
    payload: { email: string; }
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

}