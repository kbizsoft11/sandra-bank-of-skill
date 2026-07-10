import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  console.log('🔒 [AUTH GUARD] Starting check for:', state.url);

  if (!isPlatformBrowser(platformId)) {
    console.log('🔒 [AUTH GUARD] Not in browser, allowing');
    return true;
  }

  // Synchronous, token-based check — safe to do first, no race here
  const isAuth = authService.isAuthenticated();
  console.log('🔒 [AUTH GUARD] isAuthenticated:', isAuth);
  console.log('🔒 [AUTH GUARD] Token:', authService.token());
  
  if (!isAuth) {
    console.log('🔒 [AUTH GUARD] ❌ No token, redirecting to login');
    return router.createUrlTree(['/auth/login']);
  }

  console.log('🔒 [AUTH GUARD] Current user before wait:', authService.user());

  // Wait for any pending user load kicked off in the constructor
  console.log('🔒 [AUTH GUARD] Waiting for user load...');
  await authService.waitForUserLoad();

  console.log('🔒 [AUTH GUARD] After wait, user:', authService.user());

  if (authService.user()) {
    console.log('🔒 [AUTH GUARD] ✅ User loaded, allowing access');
    return true;
  }

  // Still no user after waiting — try one more explicit fetch
  console.log('🔒 [AUTH GUARD] User still null, trying explicit fetch...');
  try {
    const result = await firstValueFrom(authService.getCurrentUser());
    console.log('🔒 [AUTH GUARD] Fetch result:', result);
    if (result?.data) {
      console.log('🔒 [AUTH GUARD] ✅ User fetched successfully, allowing access');
      return true;
    }
    console.log('🔒 [AUTH GUARD] ❌ No user data in response, redirecting to login');
    return router.createUrlTree(['/auth/login']);
  } catch (error) {
    console.error('🔒 [AUTH GUARD] ❌ Error fetching user:', error);
    return router.createUrlTree(['/auth/login']);
  }
};