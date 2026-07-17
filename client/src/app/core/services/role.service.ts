import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';

export interface Role {
  _id: string;
  designationName: string;
  description?: string;
  tenantId: string;
  organisationId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRoleDto {
  designationName: string;
  description?: string;
}

export interface UpdateRoleDto {
  designationName?: string;
  description?: string;
  isActive?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class RoleService {

  private readonly http = inject(HttpClient);
  private readonly api = `${API_CONFIG.BASE_URL}/roles`;

  /**
   * Get all roles for the company
   */
  getRoles(isActive?: boolean): Observable<any> {
    const params: any = {};
    if (isActive !== undefined) {
      params.isActive = isActive.toString();
    }
    return this.http.get(this.api, { params });
  }

  /**
   * Get role by ID
   */
  getRoleById(id: string): Observable<any> {
    return this.http.get(`${this.api}/${id}`);
  }

  /**
   * Create new role
   */
  createRole(payload: CreateRoleDto): Observable<any> {
    return this.http.post(this.api, payload);
  }

  /**
   * Update role
   */
  updateRole(id: string, payload: UpdateRoleDto): Observable<any> {
    return this.http.put(`${this.api}/${id}`, payload);
  }

  /**
   * Delete role
   */
  deleteRole(id: string): Observable<any> {
    return this.http.delete(`${this.api}/${id}`);
  }
}
