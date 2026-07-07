import { inject } from '@angular/core';
import { Router, CanActivateFn, ActivatedRouteSnapshot } from '@angular/router';
import { RegistrationService } from '../services/registration.service';

/**
 * Registration Guard
 * 
 * Protects registration routes to ensure users follow the correct step sequence.
 * Redirects users to the appropriate step based on their registration progress.
 */
export const registrationGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const registrationService = inject(RegistrationService);
  const router = inject(Router);

  // Get required step from route data
  const requiredStep = route.data['requiredStep'] as number;

  // If no required step defined, allow access
  if (!requiredStep) {
    return true;
  }

  // Check if registration is expired
  if (registrationService.isExpired()) {
    console.warn('Registration session expired. Redirecting to step 1.');
    registrationService.clearRegistration();
    router.navigate(['/auth/register']);
    return false;
  }

  // Get current registration state
  const currentStep = registrationService.currentStep();
  const completedSteps = registrationService.completedSteps();

  console.log('Registration Guard Check:', {
    requiredStep,
    currentStep,
    completedSteps
  });

  // Step 1 (Register) - Always accessible
  if (requiredStep === 1) {
    return true;
  }

  // Step 2 (Verify Email) - Requires step 1 data to be saved (not necessarily completed)
  if (requiredStep === 2) {
    // Check if we have step 1 data (email)
    const step1Data = registrationService.getStep1Data();
    if (!step1Data || !step1Data.email) {
      console.warn('Step 1 data not found. Redirecting to register.');
      router.navigate(['/auth/register']);
      return false;
    }
    return true;
  }

  // Step 3 (Organisation Details) - Requires step 2 to be completed (OTP verified)
  if (requiredStep === 3) {
    if (!completedSteps.includes(2)) {
      console.warn('OTP not verified. Redirecting to verify email.');
      router.navigate(['/auth/verify-email']);
      return false;
    }
    
    // Check if token exists (received from OTP verification)
    if (!registrationService.registrationToken()) {
      console.warn('No registration token found. Redirecting to register.');
      registrationService.clearRegistration();
      router.navigate(['/auth/register']);
      return false;
    }
    
    return true;
  }

  // Step 4 (Setup Complete) - Requires step 3 to be completed (organisation details saved)
  if (requiredStep === 4) {
    if (!completedSteps.includes(3)) {
      console.warn('Organisation details not completed. Redirecting to organisation details.');
      router.navigate(['/auth/organisation-details']);
      return false;
    }
    
    // Check if token exists
    if (!registrationService.registrationToken()) {
      console.warn('No registration token found. Redirecting to register.');
      registrationService.clearRegistration();
      router.navigate(['/auth/register']);
      return false;
    }
    
    return true;
  }

  // Default: deny access
  console.warn('Invalid step or incomplete registration. Redirecting to register.');
  router.navigate(['/auth/register']);
  return false;
};

/**
 * Helper guard to check if user can proceed to a specific step
 * This is more flexible than the main guard
 */
export const canProceedToStepGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const registrationService = inject(RegistrationService);
  const router = inject(Router);

  const targetStep = route.data['step'] as number;

  if (!targetStep) {
    return true;
  }

  // Check if user can proceed to this step
  if (!registrationService.canProceedToStep(targetStep)) {
    const currentStep = registrationService.currentStep();
    
    // Redirect to current step
    switch (currentStep) {
      case 1:
        router.navigate(['/auth/register']);
        break;
      case 2:
        router.navigate(['/auth/verify-email']);
        break;
      case 3:
        router.navigate(['/auth/organisation-details']);
        break;
      case 4:
        router.navigate(['/auth/setup-complete']);
        break;
      default:
        router.navigate(['/auth/register']);
    }
    
    return false;
  }

  return true;
};
