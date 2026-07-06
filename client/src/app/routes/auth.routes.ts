import { Routes } from '@angular/router';

export const authRoutes: Routes = [
    {
        path: 'welcome',
        loadComponent: () => import('../features/auth/welcome/welcome').then(c => c.Welcome)
    },

    {
        path: 'get-started',
        loadComponent: () => import('../features/auth/get-started/get-started').then(c => c.GetStarted)
    },

    {
        path: 'how-to-join',
        loadComponent: () => import('../features/auth/how-to-join/how-to-join').then(c => c.HowToJoin)
    },

    {
        path: 'login',
        loadComponent: () => import('../features/auth/login/login').then(c => c.Login)
    },

    {
        path: 'register',
        loadComponent: () => import('../features/auth/register/register').then(c => c.Register)
    },

    {
        path: 'verify-email',
        loadComponent: () => import('../features/auth/verify-email/verify-email').then(c => c.VerifyEmail)
    },

    {
        path: 'organisation-details',
        loadComponent: () => import('../features/auth/organisation-details/organisation-details').then(c => c.OrganisationDetails)
    },

    {
        path: 'setup-complete',
        loadComponent: () => import('../features/auth/setup-complete/setup-complete').then(c => c.SetupComplete)
    }
];