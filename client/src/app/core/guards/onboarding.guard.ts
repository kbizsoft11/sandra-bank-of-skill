import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/**
 * Onboarding Guard
 * Checks if employee has completed mandatory onboarding questionnaire
 * Redirects fresh employees to questionnaire page instead of showing modal
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

  // If already on the questionnaires page, allow access
  if (state.url.includes('/my-questionnaires')) {
    console.log('🎯 [ONBOARDING GUARD] Already on questionnaires page, allowing access');
    return true;
  }

  // Employee hasn't completed onboarding - redirect to my-questionnaires
  console.log('🎯 [ONBOARDING GUARD] ❌ Onboarding not completed, redirecting to my-questionnaires');
  auth.setNeedsOnboarding(false); // Clear the flag since we're redirecting
  return router.createUrlTree(['/employee/my-questionnaires']);
};