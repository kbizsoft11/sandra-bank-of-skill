import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);


  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  // Synchronous, token-based check — safe to do first, no race here
  const isAuth = authService.isAuthenticated();
  
  if (!isAuth) {
    return router.createUrlTree(['/auth/login']);
  }


  // Wait for any pending user load kicked off in the constructor
  await authService.waitForUserLoad();


  if (authService.user()) {
    return true;
  }

  // Still no user after waiting — try one more explicit fetch
  try {
    const result = await firstValueFrom(authService.getCurrentUser());
    if (result?.data) {
      return true;
    }
    return router.createUrlTree(['/auth/login']);
  } catch (error) {
    console.error('🔒 [AUTH GUARD] ❌ Error fetching user:', error);
    return router.createUrlTree(['/auth/login']);
  }
};