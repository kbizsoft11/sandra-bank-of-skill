import { Component, OnInit, inject, signal, effect } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

import { DashboardSidebar } from '../../shared/components/dashboard-sidebar/dashboard-sidebar';
import { DashboardHeader } from '../../shared/components/dashboard-header/dashboard-header';
import { OnboardingModal } from '../../shared/components/onboarding-modal/onboarding-modal';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    DashboardSidebar,
    DashboardHeader,
    OnboardingModal
  ],
  templateUrl: './dashboard-layout.html',
  styleUrl: './dashboard-layout.scss',
})
export class DashboardLayout implements OnInit {
  private readonly auth = inject(AuthService);

  sidebarOpen = false;
  readonly showOnboardingModal = signal<boolean>(false);
  private hasCheckedOnboarding = false;

  constructor() {
    // Watch for changes to needsOnboarding signal
    effect(() => {
      const needsOnboarding = this.auth.needsOnboarding();
      console.log('📋 [DASHBOARD LAYOUT] needsOnboarding changed:', needsOnboarding);
      if (needsOnboarding && !this.showOnboardingModal()) {
        this.showOnboardingModal.set(true);
      }
    });
  }

  ngOnInit(): void {
    // Check immediately on init if employee needs onboarding (only once)
    if (!this.hasCheckedOnboarding) {
      this.hasCheckedOnboarding = true;
      if (this.auth.checkNeedsOnboarding()) {
        console.log('📋 [DASHBOARD LAYOUT] Employee needs onboarding on init');
        this.showOnboardingModal.set(true);
        this.auth.setNeedsOnboarding(true);
      }
    }
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  onOnboardingComplete(): void {
    console.log('📋 [DASHBOARD LAYOUT] Onboarding completed');
    this.showOnboardingModal.set(false);
    this.auth.setNeedsOnboarding(false);
    
    // Update the user object in memory without reloading
    // This ensures hasCompletedOnboarding is updated
    const currentUser = this.auth.user();
    if (currentUser) {
      const updatedUser = {
        ...currentUser,
        hasCompletedOnboarding: true
      };
      this.auth.user.set(updatedUser);
      console.log('📋 [DASHBOARD LAYOUT] User updated:', updatedUser);
    }
  }
}

