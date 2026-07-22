import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

import { AuthService } from '../services/auth.service';

export const guestGuard: CanActivateFn = async (route, state) => {

  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  console.log('👥 [GUEST GUARD] Checking route:', state.url);

  if (!isPlatformBrowser(platformId)) {
    console.log('👥 [GUEST GUARD] Not in browser, allowing');
    return true;
  }

  // Check if authenticated - use signal value directly
  const tokenValue = authService.token();
  const isAuth = !!tokenValue;
  
  console.log('👥 [GUEST GUARD] isAuthenticated:', isAuth);
  console.log('👥 [GUEST GUARD] Token:', tokenValue ? tokenValue.substring(0, 20) + '...' : 'null');

  // If not authenticated, allow access (guest can visit login)
  if (!isAuth) {
    console.log('👥 [GUEST GUARD] ✅ Not authenticated, allowing access to auth pages');
    return true;
  }

  // If authenticated, wait for user role to load
  console.log('👥 [GUEST GUARD] User is authenticated, waiting for user data to load...');
  await authService.waitForUserLoad();

  // Check role
  const userRole = authService.role();
  const userData = authService.user();
  
  console.log('👥 [GUEST GUARD] User role after load:', userRole);
  console.log('👥 [GUEST GUARD] User data:', userData);

  if (userRole) {
    // Authenticated user detected - redirect to their dashboard
    const dashboardPath = authService.getRoleDashboardPath();
    console.log('👥 [GUEST GUARD] ❌ Authenticated user found, redirecting to:', dashboardPath);
    return router.createUrlTree([dashboardPath]);
  }

  // If still no role, don't allow access
  console.warn('👥 [GUEST GUARD] ⚠️ No role found for authenticated user, denying access');
  return false;
};