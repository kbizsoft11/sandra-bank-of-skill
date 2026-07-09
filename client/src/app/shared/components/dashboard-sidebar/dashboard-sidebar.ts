import { Component } from '@angular/core';

@Component({
  selector: 'app-dashboard-sidebar',
  standalone: true,
  templateUrl: './dashboard-sidebar.html',
  styleUrl: './dashboard-sidebar.scss',
})
export class DashboardSidebar {
  menuItems = [
    {
      label: 'Dashboard',
      href: '#',
      icon: 'bi bi-grid-1x2-fill',
      active: true,
    },
    {
      label: 'Talent Search',
      href: '#',
      icon: 'bi bi-search',
    },
    {
      label: 'Skills Bank',
      href: '#',
      icon: 'bi bi-bank',
    },
    {
      label: 'AI Insights',
      href: '#',
      icon: 'bi bi-graph-up',
    },
    {
      label: 'Opportunities',
      href: '#',
      icon: 'bi bi-lightbulb-fill',
    },
    {
      label: 'Skill Banking',
      href: '#',
      icon: 'bi bi-person-lines-fill',
    },
    {
      label: 'Rewards',
      href: '#',
      icon: 'bi bi-gift-fill',
    },
    {
      label: 'Reports',
      href: '#',
      icon: 'bi bi-clipboard-fill',
    },
    {
      label: 'Settings',
      href: '#',
      icon: 'bi bi-gear-fill',
    },
  ];
}