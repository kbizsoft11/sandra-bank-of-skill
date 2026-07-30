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
    return status?.charAt(0).toUpperCase() + status?.slice(1);
  }

  getRoleLabel(role: string): string {
    return role?.charAt(0).toUpperCase() + role?.slice(1);
  }

  getReadinessPercent(): number {
    const currentUser = this.user();
    if (!currentUser) return 0;

    let score = 0;
    if (currentUser.profileCompleted) score += 25;
    if (currentUser.emailVerified) score += 25;
    if (currentUser.hasCompletedOnboarding) score += 25;
    if (currentUser.isActive) score += 25;

    return score;
  }

  getReadinessLabel(): string {
    const score = this.getReadinessPercent();
    if (score >= 75) return 'Strong setup';
    if (score >= 50) return 'Mostly ready';
    return 'Needs attention';
  }

  getReadinessMessage(): string {
    const currentUser = this.user();
    if (!currentUser) return 'No profile data available.';

    const missing: string[] = [];
    if (!currentUser.profileCompleted) missing.push('profile completion');
    if (!currentUser.emailVerified) missing.push('email verification');
    if (!currentUser.hasCompletedOnboarding) missing.push('onboarding');
    if (!currentUser.isActive) missing.push('active account access');

    return missing.length
      ? `Missing ${missing.join(', ')}.`
      : 'Core setup signals are complete and the profile is ready for company use.';
  }

  getAccountSummary(): string {
    const currentUser = this.user();
    if (!currentUser) return 'No user profile data available.';

    if (currentUser.accountStatus === 'suspended') {
      return 'Access is currently suspended and requires follow-up before regular use.';
    }

    if (currentUser.accountStatus === 'invited') {
      return 'The account has been invited and should be activated to begin full participation.';
    }

    if (currentUser.isActive) {
      return 'The account is active and appears ready for day-to-day business use.';
    }

    return 'The profile exists but account activity should be reviewed.';
  }

  getLastActivityLabel(): string {
    const currentUser = this.user();
    if (!currentUser?.lastLoginAt) return 'No recent activity';
    return this.formatDateShort(currentUser.lastLoginAt);
  }

  getInitials(fullName: string): string {
    if (!fullName) return 'U';
    return fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }

  getRecommendedActions(): string[] {
    const currentUser = this.user();
    if (!currentUser) return ['No profile data available.'];

    const actions: string[] = [];
    if (!currentUser.profileCompleted) {
      actions.push('Complete the profile so the employee is easier to find and understand.');
    }
    if (!currentUser.emailVerified) {
      actions.push('Verify the email address to ensure normal onboarding and recovery access.');
    }
    if (!currentUser.hasCompletedOnboarding) {
      actions.push('Finish onboarding to give the employee full access to the expected tools.');
    }
    if (!currentUser.department) {
      actions.push('Add the department so reporting and team allocation stay accurate.');
    }
    if (!currentUser.location) {
      actions.push('Capture the location to support regional and business planning visibility.');
    }

    return actions.length ? actions : ['The profile looks healthy and no immediate follow-up is required.'];
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
