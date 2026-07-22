import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AdminUsersService, User } from '../../../core/services/admin-users.service';
import { AlertService } from '../../../core/services/alert.service';

@Component({
  selector: 'app-view-user',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './view-user.html',
  styleUrl: './view-user.scss',
})
export class ViewUserComponent implements OnInit {
  private readonly adminUsersService = inject(AdminUsersService);
  private readonly alertService = inject(AlertService);
  private readonly route = inject(ActivatedRoute);

  readonly user = signal<User | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.loadUser();
  }

  private loadUser(): void {
    const userId = this.route.snapshot.paramMap.get('id');
    if (!userId) {
      this.error.set('User ID not found');
      return;
    }

    this.loading.set(true);
    this.adminUsersService.getUserById(userId).subscribe({
      next: (response) => {
        if (response.data) {
          this.user.set(response.data);
          this.error.set(null);
        }
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading user:', error);
        this.error.set(error.error?.message || 'Failed to load user details');
        this.alertService.error('Failed to load user details');
        this.loading.set(false);
      },
    });
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'active':
        return 'badge bg-success';
      case 'suspended':
        return 'badge bg-danger';
      case 'invited':
        return 'badge bg-warning';
      case 'joined':
        return 'badge bg-info';
      default:
        return 'badge bg-secondary';
    }
  }

  getRoleBadgeClass(role: string): string {
    switch (role) {
      case 'admin':
        return 'badge bg-danger';
      case 'company':
        return 'badge bg-primary';
      case 'employee':
        return 'badge bg-success';
      default:
        return 'badge bg-secondary';
    }
  }

  getStatusLabel(status: string): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  getRoleLabel(role: string): string {
    return role.charAt(0).toUpperCase() + role.slice(1);
  }

  formatDate(date: string | Date | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatDateShort(date: string | Date | undefined): string {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}
