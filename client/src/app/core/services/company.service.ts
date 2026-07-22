import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';

@Injectable({
  providedIn: 'root'
})
export class CompanyService {

  private readonly http = inject(HttpClient);
  private readonly api = `${API_CONFIG.BASE_URL}/organisations`;

  /**
   * Get all companies with pagination and filtering
   * Admin only
   */
  getAllCompanies(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }): Observable<any> {
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

    return this.http.get(
      `${this.api}/admin/companies`,
      { params: httpParams }
    );
  }

  /**
   * Get company details by ID
   * Admin only
   */
  getCompanyDetails(companyId: string): Observable<any> {
    return this.http.get(
      `${this.api}/admin/companies/${companyId}`
    );
  }

  /**
   * Get employees of an organization
   * Admin only
   */
  getOrganisationEmployees(
    organisationId: string,
    params?: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
    }
  ): Observable<any> {
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

    return this.http.get(
      `${this.api}/admin/organisations/${organisationId}/employees`,
      { params: httpParams }
    );
  }

  /**
   * Get employee skills
   * Admin only, read-only
   */
  getEmployeeSkills(employeeId: string): Observable<any> {
    return this.http.get(
      `${this.api}/admin/employees/${employeeId}/skills`
    );
  }

  /**
   * Update company status (activate/deactivate)
   * Admin only
   */
  updateCompanyStatus(
    companyId: string,
    isActive: boolean
  ): Observable<any> {
    return this.http.put(
      `${this.api}/admin/companies/${companyId}/status`,
      { isActive }
    );
  }

  /**
   * Company portal: Get my organisation
   * Company role only
   */
  getMyOrganisation(): Observable<any> {
    return this.http.get(
      `${this.api}/me`
    );
  }

  /**
   * Company portal: Update my organisation
   * Company role only
   */
  updateMyOrganisation(payload: any): Observable<any> {
    return this.http.put(
      `${this.api}/me`,
      payload
    );
  }

  /**
   * Company portal: Get organisation by ID
   * Company role only
   */
  getOrganisationById(id: string): Observable<any> {
    return this.http.get(
      `${this.api}/${id}`
    );
  }

  /**
   * Create a new company
   * Admin only
   */
  createCompany(payload: any): Observable<any> {
    return this.http.post(
      `${this.api}/admin/companies`,
      payload
    );
  }

  /**
   * Update company details
   * Admin only
   */
  updateCompany(companyId: string, payload: any): Observable<any> {
    return this.http.put(
      `${this.api}/admin/companies/${companyId}`,
      payload
    );
  }
}
