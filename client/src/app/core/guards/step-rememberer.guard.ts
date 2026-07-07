import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { RegistrationService } from '../services/registration.service';

type RegistrationStep = 1 | 2 | 3 | 4;

const stepRoutes: Record<RegistrationStep, string> = {
  1: '/auth/register',
  2: '/auth/verify-email',
  3: '/auth/organisation-details',
  4: '/auth/setup-complete',
};

const getExpectedStep = (registrationService: RegistrationService): RegistrationStep => {
  if (registrationService.isExpired()) {
    registrationService.clearRegistration();
    return 1;
  }

  const state = registrationService.getRegistrationState();

  if (!state) {
    return 1;
  }

  const completedSteps = registrationService.completedSteps();
  const step1Data = registrationService.getStep1Data();

  if (!step1Data?.email || !completedSteps.includes(1)) {
    return 1;
  }

  if (!completedSteps.includes(2) || !registrationService.registrationToken()) {
    return 2;
  }

  if (!completedSteps.includes(3)) {
    return 3;
  }

  return 4;
};

const enforceRegistrationStep = (targetStep: number | undefined) => {
  const registrationService = inject(RegistrationService);
  const router = inject(Router);

  if (!targetStep) {
    return true;
  }

  const expectedStep = getExpectedStep(registrationService);

  if (targetStep === expectedStep) {
    return true;
  }

  return router.createUrlTree([stepRoutes[expectedStep]]);
};

/**
 * Step Rememberer Guard
 * 
 * Automatically redirects users to their current registration step
 * if they have an active registration in progress.
 * 
 * This allows users to continue their registration from where they left off
 * instead of starting over.
 */
export const stepRemembererGuard: CanActivateFn = (route) =>
  enforceRegistrationStep(route.data['step'] as number | undefined);

/**
 * Step Redirector Guard
 * 
 * Used on individual step components to ensure users are redirected
 * to the correct step if they try to access a page directly.
 */
export const stepRedirectorGuard: CanActivateFn = (route) => {
  return enforceRegistrationStep(route.data['step'] as number | undefined);
};
