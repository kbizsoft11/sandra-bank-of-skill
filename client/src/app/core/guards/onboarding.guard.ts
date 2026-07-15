import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/**
 * Onboarding Guard
 * Checks if employee has completed mandatory onboarding questionnaire
 * Sets a flag that triggers the onboarding modal to show
 */
export const onboardingGuard: CanActivateFn = async (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  console.log('🎯 [ONBOARDING GUARD] Checking onboarding status for:', state.url);

  // Wait for user to be loaded if not already
  if (!auth.user()) {
    console.log('🎯 [ONBOARDING GUARD] User not loaded yet, waiting...');
    await auth.waitForUserLoad();
  }

  const user = auth.user();
  const role = auth.role();

  console.log('🎯 [ONBOARDING GUARD] User:', user?.email);
  console.log('🎯 [ONBOARDING GUARD] Role:', role);

  // Only check onboarding for employees
  if (role !== 'employee') {
    console.log('🎯 [ONBOARDING GUARD] ✅ Not an employee, skip onboarding check');
    return true;
  }

  // Check if employee has completed onboarding
  const hasCompletedOnboarding = (user as any)?.hasCompletedOnboarding;
  
  console.log('🎯 [ONBOARDING GUARD] hasCompletedOnboarding:', hasCompletedOnboarding);

  if (hasCompletedOnboarding) {
    console.log('🎯 [ONBOARDING GUARD] ✅ Onboarding completed, allowing access');
    return true;
  }

  // Employee hasn't completed onboarding - set flag to show modal
  console.log('🎯 [ONBOARDING GUARD] ❌ Onboarding not completed, setting needsOnboarding flag');
  auth.setNeedsOnboarding(true);
  
  // Always allow navigation to dashboard - modal will show there
  console.log('🎯 [ONBOARDING GUARD] Allowing navigation, modal will show');
  return true;
};
