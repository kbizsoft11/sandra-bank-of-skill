import { Component, EventEmitter, Input, Output, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { API_CONFIG } from '../../../core/config/api.config';

@Component({
  selector: 'app-dashboard-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './dashboard-sidebar.html',
  styleUrl: './dashboard-sidebar.scss',
})
export class DashboardSidebar implements OnInit {
  @Input() sidebarOpen = false;
  @Output() sidebarItemClicked = new EventEmitter<void>();

  readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);

  showUserMenu = false;
  profileImage = signal<string | null>(null);

  ngOnInit(): void {
    this.loadUserProfile();
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

  closeSidebar(): void {
    this.sidebarItemClicked.emit();
  }

  toggleUserMenu(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.showUserMenu = !this.showUserMenu;
  }

  logout(): void {
    const confirmed = confirm('Are you sure you want to logout?');
    if (!confirmed) return;
    this.auth.logout();
    this.router.navigate(['/auth/login']);
  }

  menuItems = [
    {
      label: 'Dashboard',
      route: '/admin/dashboard',
      icon: 'bi bi-grid-1x2-fill',
    },
    {
      label: 'Users',
      route: '/admin/users',
      icon: 'bi bi-people-fill',
    },
    {
      label: 'Skill Categories',
      route: '/admin/skill-categories',
      icon: 'bi bi-diagram-3-fill',
    },
    {
      label: 'Skills',
      route: '/admin/skills',
      icon: 'bi bi-lightbulb-fill',
    },
    {
      label: 'Talent Search',
      icon: 'bi bi-search',
    },
    {
      label: 'AI Insights',
      icon: 'bi bi-graph-up',
    },
    {
      label: 'Opportunities',
      icon: 'bi bi-briefcase-fill',
    },
    {
      label: 'Reports',
      icon: 'bi bi-clipboard-fill',
    },
    {
      label: 'Settings',
      icon: 'bi bi-gear-fill',
    },
  ];
}