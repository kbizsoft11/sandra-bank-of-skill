import { Routes } from '@angular/router';

export const adminRoutes: Routes = [
    {
        path: 'dashboard',
        loadComponent: () => import('../features/dashboard/dashboard-home/dashboard-home').then(c => c.DashboardHome)
    },

    {
        path: 'users',
        loadComponent: () => import('../features/users/user-list/user-list').then(c => c.UserList)
    },

    {
        path: 'users/create',
        loadComponent: () =>import('../features/users/create-user/create-user').then(c => c.CreateUser),
    },

    {
        path: 'users/:id/edit',
        loadComponent: () => import('../features/users/edit-user/edit-user').then(c => c.EditUser),
    },

    // Skill categories routes
    {
        path: 'skill-categories',
        loadComponent: () => import('../features/skill-categories/skill-category-list/skill-category-list').then(c => c.SkillCategoryList)
    },

    {
        path: 'skill-categories/create',
        loadComponent: () =>import('../features/skill-categories/create-skill-category/create-skill-category').then(c => c.CreateSkillCategory),
    },

    {
        path: 'skill-categories/:id/edit',
        loadComponent: () => import('../features/skill-categories/edit-skill-category/edit-skill-category').then(c => c.EditSkillCategory),
    },

    // Skills Routes
    {
        path: 'skills',
        loadComponent: () => import('../features/skills/skill-list/skill-list').then(c => c.SkillList)
    },

    {
        path: 'skills/create',
        loadComponent: () =>import('../features/skills/create-skill/create-skill').then(c => c.CreateSkill),
    },

    {
        path: 'skills/:id/edit',
        loadComponent: () => import('../features/skills/edit-skill/edit-skill').then(c => c.EditSkill),
    },
];