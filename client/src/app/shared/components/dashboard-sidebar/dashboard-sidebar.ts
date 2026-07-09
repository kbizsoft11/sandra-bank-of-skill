import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-dashboard-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './dashboard-sidebar.html',
  styleUrl: './dashboard-sidebar.scss',
})
export class DashboardSidebar {
  @Input() sidebarOpen = false;
  @Output() sidebarItemClicked = new EventEmitter<void>();

  closeSidebar(): void {
    this.sidebarItemClicked.emit();
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