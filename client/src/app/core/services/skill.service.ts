import {
  Injectable,
  inject
} from '@angular/core';

import { HttpClient } from '@angular/common/http';

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

  getSkills(): Observable<ApiResponse<SkillListResponse>> {

    return this.http.get<ApiResponse<SkillListResponse>>(
      `${API_CONFIG.BASE_URL}/skills`
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

}