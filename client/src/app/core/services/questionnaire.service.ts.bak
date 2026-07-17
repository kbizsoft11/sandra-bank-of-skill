import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import {
    Questionnaire,
    CreateQuestionnaireDto,
    UpdateQuestionnaireDto,
    AssignQuestionnaireDto,
    QuestionnaireWithResponse,
    QuestionnaireResponse,
    SubmitResponseDto,
    QuestionnaireResponseWithEmployee
} from '../models/questionnaire.model';

@Injectable({
    providedIn: 'root'
})
export class QuestionnaireService {

    private readonly http = inject(HttpClient);
    private readonly api = `${API_CONFIG.BASE_URL}/questionnaires`;

    // ==================== COMPANY ROLE METHODS ====================

    /**
     * Get all questionnaires for the company
     */
    getAllQuestionnaires(): Observable<any> {
        return this.http.get(this.api);
    }

    /**
     * Get specific questionnaire by ID
     */
    getQuestionnaireById(id: string): Observable<any> {
        return this.http.get(`${this.api}/${id}`);
    }

    /**
     * Create a new questionnaire
     */
    createQuestionnaire(payload: CreateQuestionnaireDto): Observable<any> {
        return this.http.post(this.api, payload);
    }

    /**
     * Update an existing questionnaire
     */
    updateQuestionnaire(id: string, payload: UpdateQuestionnaireDto): Observable<any> {
        return this.http.put(`${this.api}/${id}`, payload);
    }

    /**
     * Delete a questionnaire
     */
    deleteQuestionnaire(id: string): Observable<any> {
        return this.http.delete(`${this.api}/${id}`);
    }

    /**
     * Assign questionnaire to employees
     */
    assignQuestionnaire(id: string, payload: AssignQuestionnaireDto): Observable<any> {
        return this.http.post(`${this.api}/${id}/assign`, payload);
    }

    /**
     * Get all responses for a questionnaire
     */
    getQuestionnaireResponses(id: string): Observable<{
        success: boolean;
        message: string;
        data: {
            questionnaire: Questionnaire;
            responses: QuestionnaireResponseWithEmployee[];
        };
    }> {
        return this.http.get<any>(`${this.api}/${id}/responses`);
    }

    // ==================== EMPLOYEE ROLE METHODS ====================

    /**
     * Get all questionnaires assigned to the employee
     */
    getMyQuestionnaires(): Observable<any> {
        return this.http.get(`${this.api}/my/assigned`);
    }

    /**
     * Get specific questionnaire for employee
     */
    getQuestionnaireForEmployee(id: string): Observable<{
        success: boolean;
        message: string;
        data: {
            questionnaire: Questionnaire;
            response: QuestionnaireResponse;
        };
    }> {
        return this.http.get<any>(`${this.api}/my/${id}`);
    }

    /**
     * Submit questionnaire response (complete or partial save)
     */
    submitQuestionnaireResponse(id: string, payload: SubmitResponseDto): Observable<any> {
        return this.http.post(`${this.api}/my/${id}/submit`, payload);
    }

}
