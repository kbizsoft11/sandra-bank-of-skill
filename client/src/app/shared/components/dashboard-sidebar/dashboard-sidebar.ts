import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-dashboard-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './dashboard-sidebar.html',
  styleUrl: './dashboard-sidebar.scss',
})
export class DashboardSidebar {
  menuItems = [
    {
      label: 'Dashboard',
      route: '/admin/dashboard',
    },
    {
      label: 'Users',
      route: '/admin/users',
    }, 
    {
      label: 'Skills Categories',
      route: '/admin/skill-categories',
    },
    {
      label: 'Skills',
      route: '/admin/skills',
    },   
    {
      label: 'Assessments',
      route: '/admin/assessments',
    },
    {
      label: 'Qualifications',
      route: '/admin/qualifications',
    },
    {
      label: 'Reports',
      route: '/admin/reports',
    },
  ];
}