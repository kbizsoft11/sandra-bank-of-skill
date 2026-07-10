import {
    CanActivateFn
} from '@angular/router';

import {
    inject
} from '@angular/core';

import {
    Router
} from '@angular/router';

import {
    AuthService
} from '../services/auth.service';

export const roleGuard: CanActivateFn = async (

    route

) => {

    const auth = inject(AuthService);

    const router = inject(Router);

    console.log('🔐 [ROLE GUARD] Starting role check');
    console.log('🔐 [ROLE GUARD] User data:', auth.user());
    
    // Wait for user to be loaded if not already
    if (!auth.user()) {
        console.log('🔐 [ROLE GUARD] User not loaded yet, waiting...');
        await auth.waitForUserLoad();
        console.log('🔐 [ROLE GUARD] User loaded:', auth.user());
    }

    const role = auth.role();
    const allowed = route.data['roles'] as string[];

    console.log('🔐 [ROLE GUARD] User role:', role);
    console.log('🔐 [ROLE GUARD] Allowed roles:', allowed);

    if (role && allowed.includes(role)) {
        console.log('🔐 [ROLE GUARD] ✅ Access granted');
        return true;
    }
    
    console.log('🔐 [ROLE GUARD] ❌ Access denied, redirecting to role dashboard');
    
    // If role doesn't match, redirect to user's role-specific dashboard
    const dashboardPath = auth.getRoleDashboardPath();
    console.log('🔐 [ROLE GUARD] Dashboard path:', dashboardPath);
    router.navigate([dashboardPath]);

    return false;

};