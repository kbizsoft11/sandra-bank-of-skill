import { Routes } from '@angular/router';

import { authRoutes } from './auth.routes';
import { dashboardRoutes } from './dashboard.routes';
import { authGuard } from '../core/guards/auth.guard';
import { guestGuard } from '../core/guards/guest.guard';
import { roleGuard } from '../core/guards/role.guard';

export const routes: Routes = [
    {
        path: '',
        loadComponent: () => import('../features/frontend/home/home').then(c => c.HomeComponent)
    },

    {
        path: 'auth',
        canActivate: [guestGuard],
        loadComponent: () => import('../layouts/auth-layout/auth-layout').then(c => c.AuthLayout),
        children: authRoutes
    },

    // Admin routes - same components, different URL prefix
    {
        path: 'admin',
        canActivate: [authGuard, roleGuard],
        data: { roles: ['admin'] },
        loadComponent: () => import('../layouts/dashboard-layout/dashboard-layout').then(c => c.DashboardLayout),
        children: dashboardRoutes
    },

    // Company routes - same components, different URL prefix
    {
        path: 'company',
        canActivate: [authGuard, roleGuard],
        data: { roles: ['company'] },
        loadComponent: () => import('../layouts/dashboard-layout/dashboard-layout').then(c => c.DashboardLayout),
        children: dashboardRoutes
    },

    // Employee routes - same components, different URL prefix
    {
        path: 'employee',
        canActivate: [authGuard, roleGuard],
        data: { roles: ['employee'] },
        loadComponent: () => import('../layouts/dashboard-layout/dashboard-layout').then(c => c.DashboardLayout),
        children: dashboardRoutes
    }
];