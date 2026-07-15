import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RoleService, Role } from '../../../core/services/role.service';
import { AlertService } from '../../../core/services/alert.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-role-list',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './role-list.html',
  styleUrl: './role-list.scss'
})
export class RoleListComponent implements OnInit {
  private readonly roleService = inject(RoleService);
  private readonly alertService = inject(AlertService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  roles = signal<Role[]>([]);
  isLoading = signal<boolean>(false);
  showCreateModal = signal<boolean>(false);
  showEditModal = signal<boolean>(false);
  selectedRole = signal<Role | null>(null);

  createForm: FormGroup;
  editForm: FormGroup;

  isCreating = signal<boolean>(false);
  isUpdating = signal<boolean>(false);

  constructor() {
    this.createForm = this.fb.group({
      designationName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]]
    });

    this.editForm = this.fb.group({
      designationName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]],
      isActive: [true]
    });
  }

  ngOnInit(): void {
    this.loadRoles();
  }

  /**
   * Load all roles
   */
  loadRoles(): void {
    this.isLoading.set(true);
    this.roleService.getRoles().subscribe({
      next: (response) => {
        this.roles.set(response.data || []);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading roles:', error);
        this.alertService.error('Failed to load roles. Please try again.');
        this.isLoading.set(false);
      }
    });
  }

  /**
   * Open create modal
   */
  openCreateModal(): void {
    this.createForm.reset();
    this.showCreateModal.set(true);
  }

  /**
   * Close create modal
   */
  closeCreateModal(): void {
    this.showCreateModal.set(false);
    this.createForm.reset();
  }

  /**
   * Create new role
   */
  createRole(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    this.isCreating.set(true);

    this.roleService.createRole(this.createForm.value).subscribe({
      next: (response) => {
        this.isCreating.set(false);
        this.alertService.toast('Role created successfully', 'success');
        this.closeCreateModal();
        this.loadRoles();
      },
      error: (error) => {
        this.isCreating.set(false);
        console.error('Error creating role:', error);
        this.alertService.error(error.error?.message || 'Failed to create role. Please try again.');
      }
    });
  }

  /**
   * Open edit modal
   */
  openEditModal(role: Role): void {
    this.selectedRole.set(role);
    this.editForm.patchValue({
      designationName: role.designationName,
      description: role.description || '',
      isActive: role.isActive
    });
    this.showEditModal.set(true);
  }

  /**
   * Close edit modal
   */
  closeEditModal(): void {
    this.showEditModal.set(false);
    this.editForm.reset();
    this.selectedRole.set(null);
  }

  /**
   * Update role
   */
  updateRole(): void {
    if (this.editForm.invalid || !this.selectedRole()) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.isUpdating.set(true);

    const roleId = this.selectedRole()?._id;
    if (!roleId) return;

    this.roleService.updateRole(roleId, this.editForm.value).subscribe({
      next: (response) => {
        this.isUpdating.set(false);
        this.alertService.toast('Role updated successfully', 'success');
        this.closeEditModal();
        this.loadRoles();
      },
      error: (error) => {
        this.isUpdating.set(false);
        console.error('Error updating role:', error);
        this.alertService.error(error.error?.message || 'Failed to update role. Please try again.');
      }
    });
  }

  /**
   * Delete role
   */
  deleteRole(role: Role): void {
    this.alertService.confirmDelete(role.designationName).then((confirmed) => {
      if (confirmed) {
        this.roleService.deleteRole(role._id).subscribe({
          next: () => {
            this.alertService.toast('Role deleted successfully', 'success');
            this.loadRoles();
          },
          error: (error) => {
            console.error('Error deleting role:', error);
            this.alertService.error(error.error?.message || 'Failed to delete role. Please try again.');
          }
        });
      }
    });
  }

  /**
   * Get form control error message
   */
  getErrorMessage(formGroup: FormGroup, fieldName: string): string {
    const control = formGroup.get(fieldName);
    if (!control || !control.errors || !control.touched) return '';

    if (control.errors['required']) return `${this.getFieldLabel(fieldName)} is required`;
    if (control.errors['minlength']) return `${this.getFieldLabel(fieldName)} must be at least ${control.errors['minlength'].requiredLength} characters`;
    if (control.errors['maxlength']) return `${this.getFieldLabel(fieldName)} must not exceed ${control.errors['maxlength'].requiredLength} characters`;

    return '';
  }

  /**
   * Get field label
   */
  getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      designationName: 'Designation name',
      description: 'Description'
    };
    return labels[fieldName] || fieldName;
  }

  /**
   * Format date
   */
  formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}
