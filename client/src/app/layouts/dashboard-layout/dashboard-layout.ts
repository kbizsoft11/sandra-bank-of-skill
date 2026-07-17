import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

import { DashboardSidebar } from '../../shared/components/dashboard-sidebar/dashboard-sidebar';
import { DashboardHeader } from '../../shared/components/dashboard-header/dashboard-header';
import { AuthService } from '../../core/services/auth.service';
import { UserList } from '../../features/users/user-list/user-list';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    DashboardSidebar,
    DashboardHeader
  ],
  templateUrl: './dashboard-layout.html',
  styleUrl: './dashboard-layout.scss',
})
export class DashboardLayout implements OnInit {
  private readonly auth = inject(AuthService);

  sidebarOpen = false;
  // Onboarding modal removed - redirecting to questionnaire page instead

  constructor() {
    // Onboarding modal logic removed
  }

  ngOnInit(): void {
    // Onboarding check moved to guard - will redirect to questionnaires page
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }
}

