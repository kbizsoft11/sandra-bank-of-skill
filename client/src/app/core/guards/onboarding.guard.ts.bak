import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/**
 * Onboarding Guard
 * Checks if employee has completed mandatory onboarding questionnaire
 * Redirects to onboarding modal if not completed
 */
export const onboardingGuard: CanActivateFn = async (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  console.log('🎯 [ONBOARDING GUARD] Checking onboarding status');

  // Wait for user to be loaded if not already
  if (!auth.user()) {
    console.log('🎯 [ONBOARDING GUARD] User not loaded yet, waiting...');
    await auth.waitForUserLoad();
  }

  const user = auth.user();
  const role = auth.role();

  console.log('🎯 [ONBOARDING GUARD] User:', user);
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
    console.log('🎯 [ONBOARDING GUARD] ✅ Onboarding completed');
    return true;
  }

  // Employee hasn't completed onboarding, check if they have a pending questionnaire
  console.log('🎯 [ONBOARDING GUARD] ❌ Onboarding not completed, need to check for pending questionnaire');
  
  // Set flag that onboarding is needed (will be checked by the app component)
  auth.setNeedsOnboarding(true);
  
  // Block navigation to dashboard until onboarding is complete
  console.log('🎯 [ONBOARDING GUARD] Blocking navigation, onboarding required');
  return false;
};
