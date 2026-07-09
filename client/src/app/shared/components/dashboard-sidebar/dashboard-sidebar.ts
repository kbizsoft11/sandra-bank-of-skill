import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-dashboard-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './dashboard-sidebar.html',
  styleUrl: './dashboard-sidebar.scss',
})
export class DashboardSidebar {
  @Input() sidebarOpen = false;
  @Output() sidebarItemClicked = new EventEmitter<void>();

  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  showUserMenu = false;

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