import { Routes } from '@angular/router';

export const authRoutes: Routes = [
    {
        path: 'login',
        loadComponent: () => import('../features/auth/login/login').then(c => c.Login)
    },

    {
        path: 'register',
        loadComponent: () => import('../features/auth/register/register').then(c => c.Register)
    }
];