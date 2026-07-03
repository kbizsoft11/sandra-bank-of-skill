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

export const roleGuard: CanActivateFn = (

    route

) => {

    const auth = inject(AuthService);

    const router = inject(Router);

    const role = auth.role();

    const allowed =
        route.data['roles'] as string[];

    if (role && allowed.includes(role)) {

        return true;

    }
    
    router.navigate(['/dashboard']);

    return false;

};