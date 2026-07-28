import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';

@Injectable({
  providedIn: 'root',
})
export class DocumentRequirementService {
  private apiUrl = `${API_CONFIG.BASE_URL}/documents/requirements`;

  constructor(private http: HttpClient) {}

  /**
   * Create a new document requirement (Company admin only)
   */
  createRequirement(data: {
    documentType: string;
    description?: string;
    isRequired?: boolean;
    acceptedFormats?: string[];
    maxFileSize?: number;
    requiresApproval?: boolean;
    displayOrder?: number;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/create`, data);
  }

  /**
   * Get all requirements for company
   */
  getRequirements(): Observable<any> {
    return this.http.get(`${this.apiUrl}`);
  }

  /**
   * Get employee document upload status for all requirements
   */
  getEmployeeDocumentStatus(employeeId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/employee-status/${employeeId}`);
  }

  /**
   * Get company compliance report
   */
  getComplianceReport(): Observable<any> {
    return this.http.get(`${this.apiUrl}/compliance-report`);
  }

  /**
   * Update a document requirement
   */
  updateRequirement(id: string, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data);
  }

  /**
   * Delete a document requirement
   */
  deleteRequirement(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
