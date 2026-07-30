import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

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

  getAll(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }): Observable<ApiResponse<SkillCategory[] | any>> {
    let httpParams = new HttpParams();

    if (params?.page) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params?.limit) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }
    if (params?.search) {
      httpParams = httpParams.set('search', params.search);
    }
    if (params?.status) {
      httpParams = httpParams.set('status', params.status);
    }

    return this.http.get<ApiResponse<SkillCategory[] | any>>(
      `${API_CONFIG.BASE_URL}/skill-categories`,
      { params: httpParams }
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

  updateStatus(id: string, isActive: boolean): Observable<ApiResponse<SkillCategory>> {
    return this.http.patch<ApiResponse<SkillCategory>>(
      `${API_CONFIG.BASE_URL}/skill-categories/${id}/status`,
      { isActive }
    );
  }

  delete(id: string) {

    return this.http.delete(
      `${API_CONFIG.BASE_URL}/skill-categories/${id}`
    );

  }

  getSkillsByCategory(categoryId: string, params?: {
    page?: number;
    limit?: number;
    search?: string;
    skill_level?: string;
  }): Observable<ApiResponse<any>> {
    let httpParams = new HttpParams();

    if (params?.page) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params?.limit) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }
    if (params?.search) {
      httpParams = httpParams.set('search', params.search);
    }
    if (params?.skill_level) {
      httpParams = httpParams.set('skill_level', params.skill_level);
    }

    return this.http.get<ApiResponse<any>>(
      `${API_CONFIG.BASE_URL}/skills/category/${categoryId}`,
      { params: httpParams }
    );
  }

  moveSkills(skillIds: string[], targetCategoryId: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${API_CONFIG.BASE_URL}/skills/bulk/move`,
      { skillIds, targetCategoryId }
    );
  }

  assignSkills(skillIds: string[], targetCategoryId: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${API_CONFIG.BASE_URL}/skills/bulk/assign`,
      { skillIds, targetCategoryId }
    );
  }

  removeSkills(skillIds: string[]): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${API_CONFIG.BASE_URL}/skills/bulk/remove`,
      { skillIds }
    );
  }

  getUnassignedSkills(categoryId: string, params?: {
    page?: number;
    limit?: number;
    search?: string;
    skill_level?: string;
  }): Observable<ApiResponse<any>> {
    let httpParams = new HttpParams();

    if (params?.page) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params?.limit) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }
    if (params?.search) {
      httpParams = httpParams.set('search', params.search);
    }
    if (params?.skill_level) {
      httpParams = httpParams.set('skill_level', params.skill_level);
    }

    return this.http.get<ApiResponse<any>>(
      `${API_CONFIG.BASE_URL}/skills/category/${categoryId}/unassigned`,
      { params: httpParams }
    );
  }

}