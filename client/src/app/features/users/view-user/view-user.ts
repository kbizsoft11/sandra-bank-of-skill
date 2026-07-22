import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { API_CONFIG } from '../../../core/config/api.config';

@Component({
  selector: 'app-view-user',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './view-user.html',
  styleUrls: ['./view-user.scss'],
})
export class ViewUser implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);

  readonly user = signal<any>(null);
  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string>('');

  ngOnInit(): void {
    this.loadUser();
  }

  private loadUser(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.errorMessage.set('Unable to determine employee ID.');
      this.isLoading.set(false);
      return;
    }

    this.userService.getUserById(id).subscribe({
      next: (response) => {
        const employee = response.data;
        this.user.set({
          ...employee,
          profileImage: employee.profileImage ? `${API_CONFIG.SERVER_URL}${employee.profileImage}` : null,
        });
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(error.error?.message || 'Failed to load employee profile.');
        this.isLoading.set(false);
      }
    });
  }

  get profileImage(): string | null {
    return this.user()?.profileImage || null;
  }

  get employeeStatus(): string {
    const status = this.user()?.accountStatus || 'active';
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  get isActive(): boolean {
    return this.user()?.isActive;
  }

  getSkillsText(user: any): string {
    if (!user?.skills?.length) {
      return 'No skills found.';
    }
    return user.skills.map((skill: any) => skill.skill_name).join(', ');
  }

  get baseUrl(): string {
    const role = this.authService.role();
    return role === 'admin' ? '/admin' : `/${role}`;
  }
}
