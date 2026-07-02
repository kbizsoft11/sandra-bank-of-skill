import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable } from 'rxjs';

import { User } from '../../shared/interfaces/user.interface';
import { ApiResponse } from '../../shared/interfaces/api-response.interface';
import { API_CONFIG } from '../config/api.config';

@Injectable({
  providedIn: 'root',
})
export class UserService {

  private http = inject(HttpClient);

  private apiUrl = API_CONFIG.BASE_URL + '/users';

  getUsers(): Observable<ApiResponse<User[]>> {

    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YTMzZThiMDlkZmNhZDUzMmM4OTRkZjEiLCJlbWFpbCI6InNha3NoYW1AZ21haWwuY29tIiwicm9sZSI6ImVtcGxveWVlIiwidGVuYW50SWQiOiJjb21wYW55LTEiLCJpYXQiOjE3ODE4NjY0NDYsImV4cCI6MTc4MjQ3MTI0Nn0.JRZG3nGD3mNUit39kImxicOI9yAn4QDQHqEtxF4Hfa0';

    return this.http.get<ApiResponse<User[]>>(
      this.apiUrl,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
  }
}