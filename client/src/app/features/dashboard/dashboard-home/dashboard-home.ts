import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { take } from 'rxjs';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { DashboardService } from '../../../core/services/dashboard.service';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard-home.html',
  styleUrl: './dashboard-home.scss',
})
export class DashboardHome implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly dashboardService = inject(DashboardService);

  // Admin stats
  readonly adminStats = signal<any>(null);
  
  // Company stats
  readonly companyStats = signal<any>(null);
  
  // Employee stats
  readonly employeeStats = signal<any>(null);
  
  readonly loading = signal(true);

  get currentUserName(): string {
    const user = this.authService.user();
    return user?.fullName || 'User';
  }

  get currentRole(): string {
    return this.authService.role() || '';
  }

  isAdmin = computed(() => this.authService.isAdmin());
  isCompany = computed(() => this.authService.isCompany());
  isEmployee = computed(() => this.authService.isEmployee());

  ngOnInit(): void {
    this.loadDashboardStats();
  }

  private loadDashboardStats(): void {
    this.loading.set(true);
    
    const role = this.authService.role();

    if (role === 'admin') {
      this.loadAdminStats();
    } else if (role === 'company') {
      this.loadCompanyStats();
    } else if (role === 'employee') {
      this.loadEmployeeStats();
    } else {
      this.loading.set(false);
    }
  }

  private loadAdminStats(): void {
    this.dashboardService.getAdminStats()
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          this.adminStats.set(response.data);
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error loading admin stats:', error);
          this.loading.set(false);
        }
      });
  }

  private loadCompanyStats(): void {
    this.dashboardService.getCompanyStats()
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          this.companyStats.set(response.data);
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error loading company stats:', error);
          this.loading.set(false);
        }
      });
  }

  private loadEmployeeStats(): void {
    this.dashboardService.getEmployeeStats()
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          this.employeeStats.set(response.data);
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error loading employee stats:', error);
          this.loading.set(false);
        }
      });
  }

  getRolePrefix(): string {
    const role = this.authService.role();
    return role || 'admin';
  }
}
