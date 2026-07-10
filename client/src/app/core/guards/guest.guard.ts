import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

export const guestGuard: CanActivateFn = () => {

  const authService = inject(AuthService);
  const router = inject(Router);

  // If not authenticated, allow access (continue to login)
  if (!authService.isAuthenticated()) {
    return true;
  }

  // If authenticated, redirect to role-specific dashboard
  // But only if user data is loaded
  const userRole = authService.role();
  if (userRole) {
    const dashboardPath = authService.getRoleDashboardPath();
    return router.createUrlTree([dashboardPath]);
  }

  // If still loading, allow for now (auth guard will handle it)
  return true;
};