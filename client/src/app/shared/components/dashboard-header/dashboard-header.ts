import { Component, EventEmitter, inject, Output, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ThemeService } from '../../../core/services/theme.service';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { AlertService } from '../../../core/services/alert.service';
import { Router } from '@angular/router';
import { API_CONFIG } from '../../../core/config/api.config';

@Component({
  selector: 'app-dashboard-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard-header.html',
  styleUrl: './dashboard-header.scss',
})
export class DashboardHeader implements OnInit, OnDestroy {
  private readonly themeService = inject(ThemeService);
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly alertService = inject(AlertService);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);
  
  showProfileMenu = false;
  profileImage = signal<string | null>(null);
  private docClickHandler = () => { this.showProfileMenu = false; };

  @Output() toggleSidebar = new EventEmitter<void>();

  ngOnInit(): void {
    document.addEventListener('click', this.docClickHandler);
    this.loadUserProfile();
  }

  ngOnDestroy(): void {
    document.removeEventListener('click', this.docClickHandler);
  }

  loadUserProfile(): void {
    this.userService.getMyProfile().subscribe({
      next: (response) => {
        const userData = response.data;
        if (userData.profileImage) {
          this.profileImage.set(`${API_CONFIG.SERVER_URL}${userData.profileImage}`);
        }
      },
      error: (error) => {
        console.error('Error loading profile image:', error);
      }
    });
  }

  getInitials(): string {
    const name = this.auth.user()?.fullName || 'User';
    return name.charAt(0).toUpperCase();
  }

  getRandomColor(): string {
    const name = this.auth.user()?.fullName || 'User';
    const colors = [
      '#667eea', '#764ba2', '#f093fb', '#4facfe',
      '#43e97b', '#fa709a', '#fee140', '#30cfd0',
      '#a8edea', '#fed6e3', '#c471ed', '#12c2e9'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  onToggleSidebar(): void {
    this.toggleSidebar.emit();
  }

  toggleProfileMenu(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.showProfileMenu = !this.showProfileMenu;
  }

  logout(): void {
    this.alertService.confirm(
      'You will be logged out of your account.',
      'Are you sure you want to logout?',
      'Yes, logout',
      'Cancel'
    ).then((confirmed) => {
      if (confirmed) {
        this.authService.logout();
        this.router.navigate(['/auth/login']);
        this.alertService.toast('Logged out successfully', 'success');
      }
    });
  }

  get isDark(): boolean {
    return this.themeService.getTheme() === 'dark';
  }

}