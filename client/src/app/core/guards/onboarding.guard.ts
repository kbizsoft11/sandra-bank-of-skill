import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { QuestionnaireService } from '../services/questionnaire.service';

/**
 * Onboarding Guard
 * Checks if employee has completed mandatory onboarding questionnaire
 * Redirects fresh employees to questionnaire page instead of showing modal
 */
export const onboardingGuard: CanActivateFn = async (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const questionnaireService = inject(QuestionnaireService);


  // Wait for user to be loaded if not already
  if (!auth.user()) {
    await auth.waitForUserLoad();
  }

  const user = auth.user();
  const role = auth.role();


  // Only check onboarding for employees
  if (role !== 'employee') {
    return true;
  }

  // Check if employee has completed onboarding
  const hasCompletedOnboarding = (user as any)?.hasCompletedOnboarding;
  

  if (hasCompletedOnboarding) {
    return true;
  }

  // If already on the questionnaires page, allow access
  if (state.url.includes('/my-questionnaires')) {
    return true;
  }

  try {
    const response = await firstValueFrom(questionnaireService.getAssignedQuestionnaires());
    const assignedQuestionnaires = Array.isArray(response?.data) ? response.data : [];

    if (assignedQuestionnaires.length === 0) {
      return true;
    }

    const hasIncompleteQuestionnaire = assignedQuestionnaires.some(
      (questionnaire: any) => questionnaire.status !== 'completed'
    );

    if (!hasIncompleteQuestionnaire) {
      await firstValueFrom(auth.getCurrentUser());
      auth.setNeedsOnboarding(false);
      return true;
    }
  } catch (error) {
    console.error('Unable to verify questionnaire completion before onboarding redirect:', error);
  }

  // Employee hasn't completed onboarding - redirect to my-questionnaires
  auth.setNeedsOnboarding(false); // Clear the flag since we're redirecting
  return router.createUrlTree(['/employee/my-questionnaires']);
};
