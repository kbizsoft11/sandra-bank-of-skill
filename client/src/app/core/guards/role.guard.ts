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

    
    // Wait for user to be loaded if not already
    if (!auth.user()) {
        await auth.waitForUserLoad();
    }

    const role = auth.role();
    const allowed = route.data['roles'] as string[];


    if (role && allowed.includes(role)) {
        return true;
    }
    
    
    // If role doesn't match, redirect to user's role-specific dashboard
    const dashboardPath = auth.getRoleDashboardPath();
    router.navigate([dashboardPath]);

    return false;

};