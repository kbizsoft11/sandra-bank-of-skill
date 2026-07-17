import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_CONFIG } from '../config/api.config';
import { ApiResponse } from '../../shared/interfaces/api-response.interface';
import {
  CompanySkillCategoryMapping,
  CreateCompanySkillCategory,
  UpdateCompanySkillCategory,
} from '../../shared/interfaces/skill-category.interface';

@Injectable({
  providedIn: 'root',
})
export class CompanySkillCategoryService {
  private readonly http = inject(HttpClient);

  getAll(): Observable<ApiResponse<CompanySkillCategoryMapping[]>> {
    return this.http.get<ApiResponse<CompanySkillCategoryMapping[]>>(
      `${API_CONFIG.BASE_URL}/company-skill-categories`
    );
  }

  create(payload: CreateCompanySkillCategory): Observable<ApiResponse<unknown>> {
    return this.http.post<ApiResponse<unknown>>(
      `${API_CONFIG.BASE_URL}/company-skill-categories`,
      payload
    );
  }

  update(id: string, payload: UpdateCompanySkillCategory): Observable<ApiResponse<unknown>> {
    return this.http.put<ApiResponse<unknown>>(
      `${API_CONFIG.BASE_URL}/company-skill-categories/${id}`,
      payload
    );
  }

  delete(id: string): Observable<ApiResponse<unknown>> {
    return this.http.delete<ApiResponse<unknown>>(
      `${API_CONFIG.BASE_URL}/company-skill-categories/${id}`
    );
  }
}
