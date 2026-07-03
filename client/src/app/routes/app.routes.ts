import { Routes } from '@angular/router';

import { authRoutes } from './auth.routes';
import { adminRoutes } from './admin.routes';
import { authGuard } from '../core/guards/auth.guard';
import { guestGuard } from '../core/guards/guest.guard';

export const routes: Routes = [
    {
        path: '',
        // redirectTo: 'auth/login',
        // pathMatch: 'full'
        loadComponent: () => import('../features/frontend/home/home').then(c => c.HomeComponent)
    },

    {
        path: 'auth',
        canActivate: [guestGuard],
        loadComponent: () => import('../layouts/auth-layout/auth-layout').then(c => c.AuthLayout),
        children: authRoutes
    },

    {
        path: 'admin',
        canActivate: [authGuard],        
        loadComponent: () => import('../layouts/dashboard-layout/dashboard-layout').then(c => c.DashboardLayout),
        children: adminRoutes
    }
];