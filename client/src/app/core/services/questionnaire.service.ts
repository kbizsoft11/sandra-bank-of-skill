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

    /**
     * Toggle status (activate/deactivate) of a questionnaire
     */
    toggleStatus(id: string): Observable<any> {
        return this.http.patch(`${this.api}/${id}/toggle-status`, {});
    }

    /**
     * Duplicate a questionnaire
     */
    duplicateQuestionnaire(id: string): Observable<any> {
        return this.http.post(`${this.api}/${id}/duplicate`, {});
    }

    // ==================== EMPLOYEE ROLE METHODS (NEW IMPROVED API) ====================

    /**
     * Get all questionnaires assigned to the employee
     */
    getAssignedQuestionnaires(): Observable<any> {
        return this.http.get(`${this.api}/employee/assigned`);
    }

    /**
     * Start or resume a questionnaire
     */
    startQuestionnaire(responseId: string): Observable<any> {
        return this.http.get(`${this.api}/employee/${responseId}/start`);
    }

    /**
     * Save answer for a single question
     */
    saveQuestionAnswer(responseId: string, questionId: string, answerData: any): Observable<any> {
        return this.http.post(`${this.api}/employee/${responseId}/questions/${questionId}/answer`, answerData);
    }

    /**
     * Get questionnaire progress
     */
    getQuestionnaireProgress(responseId: string): Observable<any> {
        return this.http.get(`${this.api}/employee/${responseId}/progress`);
    }

    // ==================== LEGACY EMPLOYEE METHODS ====================

    /**
     * Get all questionnaires assigned to the employee (legacy)
     */
    getMyQuestionnaires(): Observable<any> {
        return this.http.get(`${this.api}/my/assigned`);
    }

    /**
     * Get specific questionnaire for employee (legacy)
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
     * Submit questionnaire response (complete or partial save) (legacy)
     */
    submitQuestionnaireResponse(id: string, payload: SubmitResponseDto): Observable<any> {
        return this.http.post(`${this.api}/my/${id}/submit`, payload);
    }

    // ==================== ONBOARDING METHODS ====================

    /**
     * Get pending onboarding questionnaire for the logged-in employee
     */
    getPendingOnboarding(): Observable<{
        success: boolean;
        message: string;
        data: {
            hasOnboarding: boolean;
            questionnaire?: Questionnaire;
            response?: QuestionnaireResponse;
        };
    }> {
        return this.http.get<any>(`${this.api}/onboarding/pending`);
    }

}