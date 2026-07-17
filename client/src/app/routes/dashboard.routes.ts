import { Routes } from '@angular/router';
import { roleGuard } from '../core/guards/role.guard';

export const dashboardRoutes: Routes = [
    // Shared routes - all authenticated roles
    {
        path: 'dashboard',
        loadComponent: () => import('../features/dashboard/dashboard-home/dashboard-home').then(c => c.DashboardHome)
    },

    {
        path: 'profile',
        loadComponent: () => import('../features/profile/profile').then(c => c.Profile)
    },

    // Admin and Company routes - User management
    {
        path: 'users',
        canActivate: [roleGuard],
        data: { roles: ['admin', 'company'] },
        loadComponent: () => import('../features/users/user-list/user-list').then(c => c.UserList)
    },

    {
        path: 'users/:id/skills',
        canActivate: [roleGuard],
        data: { roles: ['admin', 'company'] },
        loadComponent: () => import('../features/skills/skill-list/skill-list').then(c => c.SkillList)
    },

    {
        path: 'users/create',
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
        loadComponent: () =>import('../features/users/create-user/create-user').then(c => c.CreateUser),
    },

    {
        path: 'users/:id/edit',
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
        loadComponent: () => import('../features/users/edit-user/edit-user').then(c => c.EditUser),
    },

    // Skill categories routes (Admin only)
    {
        path: 'skill-categories',
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
        loadComponent: () => import('../features/skill-categories/skill-category-list/skill-category-list').then(c => c.SkillCategoryList)
    },

    {
        path: 'skill-categories/create',
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
        loadComponent: () =>import('../features/skill-categories/create-skill-category/create-skill-category').then(c => c.CreateSkillCategory),
    },

    {
        path: 'skill-categories/:id/edit',
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
        loadComponent: () => import('../features/skill-categories/edit-skill-category/edit-skill-category').then(c => c.EditSkillCategory),
    },

    {
        path: 'company-skill-categories',
        canActivate: [roleGuard],
        data: { roles: ['company'] },
        loadComponent: () => import('../features/company-skill-categories/company-skill-category-list/company-skill-category-list').then(c => c.CompanySkillCategoryList)
    },

    {
        path: 'organisation',
        canActivate: [roleGuard],
        data: { roles: ['company'] },
        loadComponent: () => import('../features/organisation/organisation-details/organisation-details').then(c => c.OrganisationDetailsPage)
    },

    // Company Skills (Company only)
    {
        path: 'company-skills',
        canActivate: [roleGuard],
        data: { roles: ['company'] },
        loadComponent: () => import('../features/company-skills/company-skills').then(c => c.CompanySkills)
    },

    // Skills Routes (Admin only - for viewing all skills)
    {
        path: 'skills',
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
        loadComponent: () => import('../features/skills/skill-list/skill-list').then(c => c.SkillList)
    },

    {
        path: 'skills/create',
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
        loadComponent: () =>import('../features/skills/create-skill/create-skill').then(c => c.CreateSkill),
    },

    {
        path: 'skills/:id/edit',
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
        loadComponent: () => import('../features/skills/edit-skill/edit-skill').then(c => c.EditSkill),
    },

    // Questionnaire routes removed from frontend navigation

    // My Skills route (Employee only - employees manage their own skills)
    {
        path: 'my-skills',
        canActivate: [roleGuard],
        data: { roles: ['employee'] },
        loadComponent: () => import('../features/skills/skill-list/skill-list').then(c => c.SkillList)
    },

    {
        path: 'my-skills/create',
        canActivate: [roleGuard],
        data: { roles: ['employee'] },
        loadComponent: () =>import('../features/skills/create-skill/create-skill').then(c => c.CreateSkill),
    },

    {
        path: 'my-skills/:id/edit',
        canActivate: [roleGuard],
        data: { roles: ['employee'] },
        loadComponent: () => import('../features/skills/edit-skill/edit-skill').then(c => c.EditSkill),
    },

    // My Employees route (Company only)
    {
        path: 'my-employees',
        canActivate: [roleGuard],
        data: { roles: ['company'] },
        loadComponent: () => import('../features/placeholder/placeholder').then(c => c.PlaceholderComponent)
    },

    // Global Employee Search (Admin and Company)
    {
        path: 'employee-search',
        canActivate: [roleGuard],
        data: { roles: ['admin', 'company'] },
        loadComponent: () => import('../features/employee-search/employee-search').then(c => c.EmployeeSearch)
    },

    // Opportunities (Employee and Company)
    {
        path: 'opportunities',
        canActivate: [roleGuard],
        data: { roles: ['employee', 'company'] },
        loadComponent: () => import('../features/placeholder/placeholder').then(c => c.PlaceholderComponent)
    },

    // Talent Search (Admin and Company)
    {
        path: 'talent-search',
        canActivate: [roleGuard],
        data: { roles: ['admin', 'company'] },
        loadComponent: () => import('../features/placeholder/placeholder').then(c => c.PlaceholderComponent)
    },

    // AI Insights (All roles)
    {
        path: 'ai-insights',
        loadComponent: () => import('../features/placeholder/placeholder').then(c => c.PlaceholderComponent)
    },

    // Reports (Admin and Company)
    {
        path: 'reports',
        canActivate: [roleGuard],
        data: { roles: ['admin', 'company'] },
        loadComponent: () => import('../features/placeholder/placeholder').then(c => c.PlaceholderComponent)
    },

    // Settings (Admin only)
    {
        path: 'settings',
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
        loadComponent: () => import('../features/placeholder/placeholder').then(c => c.PlaceholderComponent)
    },
];
