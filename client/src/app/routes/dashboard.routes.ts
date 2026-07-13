import { Routes } from '@angular/router';

export const dashboardRoutes: Routes = [
    {
        path: 'dashboard',
        loadComponent: () => import('../features/dashboard/dashboard-home/dashboard-home').then(c => c.DashboardHome)
    },

    {
        path: 'profile',
        loadComponent: () => import('../features/profile/profile').then(c => c.Profile)
    },

    // Admin-only routes
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

    // Skill categories routes (Admin only)
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

    // Skills Routes (Admin only)
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

    // Questionnaire routes (Company role)
    {
        path: 'questionnaires',
        loadComponent: () => import('../features/questionnaires/questionnaire-list/questionnaire-list').then(c => c.QuestionnaireList)
    },

    {
        path: 'questionnaires/create',
        loadComponent: () => import('../features/questionnaires/create-questionnaire/create-questionnaire').then(c => c.CreateQuestionnaire)
    },

    {
        path: 'questionnaires/:id/edit',
        loadComponent: () => import('../features/questionnaires/edit-questionnaire/edit-questionnaire').then(c => c.EditQuestionnaire)
    },

    {
        path: 'questionnaires/:id/assign',
        loadComponent: () => import('../features/questionnaires/assign-questionnaire/assign-questionnaire').then(c => c.AssignQuestionnaire)
    },

    {
        path: 'questionnaires/:id/responses',
        loadComponent: () => import('../features/questionnaires/questionnaire-responses/questionnaire-responses').then(c => c.QuestionnaireResponses)
    },

    // Questionnaire routes (Employee role)
    {
        path: 'my-questionnaires',
        loadComponent: () => import('../features/questionnaires/my-questionnaires/my-questionnaires').then(c => c.MyQuestionnaires)
    },

    {
        path: 'questionnaires/:id/submit',
        loadComponent: () => import('../features/questionnaires/submit-questionnaire/submit-questionnaire').then(c => c.SubmitQuestionnaire)
    },

    // Placeholder routes for company/employee features
    {
        path: 'my-skills',
        loadComponent: () => import('../features/placeholder/placeholder').then(c => c.PlaceholderComponent)
    },

    {
        path: 'my-employees',
        loadComponent: () => import('../features/placeholder/placeholder').then(c => c.PlaceholderComponent)
    },

    {
        path: 'opportunities',
        loadComponent: () => import('../features/placeholder/placeholder').then(c => c.PlaceholderComponent)
    },

    {
        path: 'talent-search',
        loadComponent: () => import('../features/placeholder/placeholder').then(c => c.PlaceholderComponent)
    },

    {
        path: 'ai-insights',
        loadComponent: () => import('../features/placeholder/placeholder').then(c => c.PlaceholderComponent)
    },

    {
        path: 'reports',
        loadComponent: () => import('../features/placeholder/placeholder').then(c => c.PlaceholderComponent)
    },

    {
        path: 'settings',
        loadComponent: () => import('../features/placeholder/placeholder').then(c => c.PlaceholderComponent)
    },
];
