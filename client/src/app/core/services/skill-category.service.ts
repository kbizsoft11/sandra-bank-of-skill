import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable } from 'rxjs';

import { API_CONFIG } from '../config/api.config';

import {
  SkillCategory,
  CreateSkillCategory,
  UpdateSkillCategory
} from '../../shared/interfaces/skill-category.interface';

import { ApiResponse } from '../../shared/interfaces/api-response.interface';

@Injectable({
  providedIn: 'root'
})
export class SkillCategoryService {

  private readonly http = inject(HttpClient);

  getAll(): Observable<ApiResponse<SkillCategory[]>> {

    return this.http.get<ApiResponse<SkillCategory[]>>(
      `${API_CONFIG.BASE_URL}/skill-categories`
    );

  }

  getById(id: string): Observable<ApiResponse<SkillCategory>> {

    return this.http.get<ApiResponse<SkillCategory>>(
      `${API_CONFIG.BASE_URL}/skill-categories/${id}`
    );

  }

  create(
    payload: CreateSkillCategory
  ): Observable<ApiResponse<SkillCategory>> {

    return this.http.post<ApiResponse<SkillCategory>>(
      `${API_CONFIG.BASE_URL}/skill-categories`,
      payload
    );

  }

  update(
    id: string,
    payload: UpdateSkillCategory
  ): Observable<ApiResponse<SkillCategory>> {

    return this.http.put<ApiResponse<SkillCategory>>(
      `${API_CONFIG.BASE_URL}/skill-categories/${id}`,
      payload
    );

  }

  delete(id: string) {

    return this.http.delete(
      `${API_CONFIG.BASE_URL}/skill-categories/${id}`
    );

  }

}