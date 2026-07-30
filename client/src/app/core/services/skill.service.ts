import {
  Injectable,
  inject
} from '@angular/core';

import { HttpClient, HttpParams } from '@angular/common/http';

import { Observable } from 'rxjs';

import { API_CONFIG } from '../config/api.config';

import {
  Skill,
  CreateSkill,
  SkillListResponse
} from '../../shared/interfaces/skill.interface';

import { ApiResponse } from '../../shared/interfaces/api-response.interface';

@Injectable({
  providedIn: 'root'
})
export class SkillService {

  private readonly http =
    inject(HttpClient);

  getSkills(query?: Record<string, string | string[] | undefined>): Observable<ApiResponse<SkillListResponse>> {
    let params = new HttpParams();

    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            value.forEach((item) => {
              params = params.append(key, item);
            });
          } else {
            params = params.set(key, value);
          }
        }
      });
    }

    return this.http.get<ApiResponse<SkillListResponse>>(
      `${API_CONFIG.BASE_URL}/skills`,
      { params }
    );

  }

  getSkill(id: string): Observable<ApiResponse<Skill>> {

    return this.http.get<ApiResponse<Skill>>(
      `${API_CONFIG.BASE_URL}/skills/${id}`
    );

  }

  createSkill(
    payload: CreateSkill
  ) {

    return this.http.post(
      `${API_CONFIG.BASE_URL}/skills`,
      payload
    );

  }

  updateSkill(
    id: string,
    payload: Partial<CreateSkill>
  ) {

    return this.http.put(
      `${API_CONFIG.BASE_URL}/skills/${id}`,
      payload
    );

  }

  deleteSkill(id: string) {

    return this.http.delete(
      `${API_CONFIG.BASE_URL}/skills/${id}`
    );

  }

  bulkDeleteSkills(skillIds: string[]) {
    return this.http.post(
      `${API_CONFIG.BASE_URL}/skills/bulk/remove`,
      { skillIds }
    );
  }

  bulkMoveSkills(skillIds: string[], categoryId: string) {
    return this.http.post(
      `${API_CONFIG.BASE_URL}/skills/bulk/move`,
      { skillIds, targetCategoryId: categoryId }
    );
  }

  bulkArchiveSkills(skillIds: string[]) {
    return this.http.patch(
      `${API_CONFIG.BASE_URL}/skills/bulk/archive`,
      { skillIds, archived: true }
    );
  }

  bulkUpdateStatus(skillIds: string[], status: 'active' | 'inactive') {
    return this.http.patch(
      `${API_CONFIG.BASE_URL}/skills/bulk/status`,
      { skillIds, status }
    );
  }

}