import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import { SkillUser, SkillUserResponse } from '../../shared/interfaces/skill-user.interface';

@Injectable({
  providedIn: 'root'
})
export class SkillUserService {

  private readonly http = inject(HttpClient);
  private readonly api = `${API_CONFIG.BASE_URL}/skill-users`;

  /**
   * Get all skills for a specific user
   */
  getByUser(userId: string, query?: any): Observable<any> {
    let url = `${this.api}/user/${userId}`;
    return this.http.get<any>(url, { params: query });
  }

  /**
   * Get user's skills filtered by enabled categories (for employee profile)
   * 
   * This ensures employees only see skills from categories their company has enabled
   */
  getInEnabledCategories(userId: string): Observable<any> {
    return this.http.get<any>(`${this.api}/user/${userId}/enabled-categories`);
  }

  /**
   * Get skills for a specific skill
   * @param skillId - The skill ID
   */
  getBySkill(skillId: string): Observable<any> {
    return this.http.get<any>(`${this.api}/skill/${skillId}`);
  }

  /**
   * Get a specific SkillUser record
   */
  getById(id: string): Observable<any> {
    return this.http.get<any>(`${this.api}/${id}`);
  }

  /**
   * Get skills from a questionnaire response
   */
  getFromQuestionnaire(questionnaireId: string): Observable<any> {
    return this.http.get<any>(`${this.api}/questionnaire/${questionnaireId}`);
  }

  /**
   * Create or update a SkillUser record (upsert)
   */
  upsert(data: any): Observable<any> {
    return this.http.post<any>(this.api, data);
  }

  /**
   * Update a SkillUser record
   */
  update(id: string, data: any): Observable<any> {
    return this.http.put<any>(`${this.api}/${id}`, data);
  }

  /**
   * Delete a SkillUser record
   */
  delete(id: string): Observable<any> {
    return this.http.delete<any>(`${this.api}/${id}`);
  }
}
