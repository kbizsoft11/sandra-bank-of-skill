import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import { ApiResponse } from '../../shared/interfaces/api-response.interface';

@Injectable({
  providedIn: 'root'
})
export class OrganisationService {
  private readonly http = inject(HttpClient);

  getMyOrganisation(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${API_CONFIG.BASE_URL}/organisations/me`);
  }

  updateMyOrganisation(payload: any): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${API_CONFIG.BASE_URL}/organisations/me`, payload);
  }
}
