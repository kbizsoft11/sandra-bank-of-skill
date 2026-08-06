import { Routes } from '@angular/router';
import { roleGuard } from '../core/guards/role.guard';

export const dashboardRoutes: Routes = [
  // Dashboard - different behavior based on role
  // Admin: shows admin dashboard, Company/Employee: shows regular dashboard
  {
    path: 'dashboard',
    loadComponent: () =>
      import('../features/dashboard/dashboard-home/dashboard-home').then((c) => c.DashboardHome),
  },

  {
    path: 'prism-report/:employeeId',
    canActivate: [roleGuard],
    data: { roles: ['admin', 'company', 'employee'] },
    loadComponent: () => import('../features/prism-report/prism-report').then((c) => c.PrismReportComponent),
  },

  {
    path: 'profile',
    loadComponent: () => import('../features/profile/profile').then((c) => c.Profile),
  },

  // Admin routes - Company management
  {
    path: 'companies',
    canActivate: [roleGuard],
    data: { roles: ['admin'] },
    loadComponent: () =>
      import('../features/admin-companies/admin-companies-list').then((c) => c.AdminCompaniesList),
  },

  {
    path: 'companies/create',
    canActivate: [roleGuard],
    data: { roles: ['admin'] },
    loadComponent: () =>
      import('../features/admin-companies/create-company/create-company').then(
        (c) => c.CreateCompany,
      ),
  },

  {
    path: 'companies/:id/edit',
    canActivate: [roleGuard],
    data: { roles: ['admin'] },
    loadComponent: () =>
      import('../features/admin-companies/edit-company/edit-company').then((c) => c.EditCompany),
  },

  {
    path: 'companies/:id',
    canActivate: [roleGuard],
    data: { roles: ['admin'] },
    loadComponent: () =>
      import('../features/admin-companies/company-details').then((c) => c.CompanyDetails),
  },

  {
    path: 'organisation/:organisationId/employees',
    canActivate: [roleGuard],
    data: { roles: ['admin'] },
    loadComponent: () =>
      import('../features/admin-companies/organisation-employees').then(
        (c) => c.OrganisationEmployees,
      ),
  },

  {
    path: 'employee/:employeeId/skills',
    canActivate: [roleGuard],
    data: { roles: ['admin'] },
    loadComponent: () =>
      import('../features/admin-companies/employee-skills').then((c) => c.EmployeeSkills),
  },

  // Admin routes - User management (ALL USERS - Admin only) - DISABLED
  // {
  //   path: 'users-admin',
  //   canActivate: [roleGuard],
  //   data: { roles: ['admin'] },
  //   loadComponent: () =>
  //     import('../features/admin-users/admin-users-list/admin-users-list').then(
  //       (c) => c.AdminUsersList,
  //     ),
  // },
    {
        path: 'organisation/:organisationId/employee/:employeeId/skills',
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
        loadComponent: () => import('../features/admin-companies/employee-skills').then(c => c.EmployeeSkills)
    },

    {
        path: 'organisation/:organisationId/employee/:employeeId/profile',
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
        loadComponent: () => import('../features/admin-companies/employee-profile/employee-profile').then(c => c.EmployeeProfile)
    },

    // Admin routes - User management (ALL USERS - Admin only) - DISABLED
    // {
    //     path: 'users-admin',
    //     canActivate: [roleGuard],
    //     data: { roles: ['admin'] },
    //     loadComponent: () => import('../features/admin-users/admin-users-list/admin-users-list').then(c => c.AdminUsersList)
    // },

  // {
  //   path: 'users-admin/:id',
  //   canActivate: [roleGuard],
  //   data: { roles: ['admin'] },
  //   loadComponent: () =>
  //     import('../features/admin-users/view-user/view-user').then((c) => c.ViewUserComponent),
  // },

  // {
  //   path: 'users-admin/:id/edit',
  //   canActivate: [roleGuard],
  //   data: { roles: ['admin'] },
  //   loadComponent: () =>
  //     import('../features/admin-users/edit-user/edit-user').then((c) => c.EditUserComponent),
  // },

  // Old Users routes - Company employees (kept for backward compatibility)
  {
    path: 'users',
    canActivate: [roleGuard],
    data: { roles: ['admin', 'company'] },
    loadComponent: () => import('../features/users/user-list/user-list').then((c) => c.UserList),
  },

  {
    path: 'users/:id/skills',
    canActivate: [roleGuard],
    data: { roles: ['admin', 'company'] },
    loadComponent: () =>
      import('../features/skills/skill-list/skill-list').then((c) => c.SkillList),
  },

  {
    path: 'users/:id/profile',
    canActivate: [roleGuard],
    data: { roles: ['admin', 'company'] },
    loadComponent: () => import('../features/users/view-user/view-user').then((c) => c.ViewUser),
  },

  {
    path: 'employee-activity',
    canActivate: [roleGuard],
    data: { roles: ['admin', 'company'] },
    loadComponent: () =>
      import('../features/employee-activity/employee-activity').then((c) => c.EmployeeActivity),
  },

  {
    path: 'activity-logs',
    canActivate: [roleGuard],
    data: { roles: ['admin', 'company'] },
    loadComponent: () =>
      import('../features/admin-activity-logs/admin-activity-logs').then((c) => c.AdminActivityLogs),
  },

  {
    path: 'users/create',
    canActivate: [roleGuard],
    data: { roles: ['admin'] },
    loadComponent: () =>
      import('../features/users/create-user/create-user').then((c) => c.CreateUser),
  },

  {
    path: 'users/:id/edit',
    canActivate: [roleGuard],
    data: { roles: ['admin'] },
    loadComponent: () => import('../features/users/edit-user/edit-user').then((c) => c.EditUser),
  },

  // Roles/Designations routes (Company only)
  {
    path: 'roles',
    canActivate: [roleGuard],
    data: { roles: ['company'] },
    loadComponent: () =>
      import('../features/roles/role-list/role-list').then((c) => c.RoleListComponent),
  },

  // Skill categories routes (Admin only)
  {
    path: 'skill-categories',
    canActivate: [roleGuard],
    data: { roles: ['admin'] },
    loadComponent: () =>
      import('../features/skill-categories/skill-category-list/skill-category-list').then(
        (c) => c.SkillCategoryList,
      ),
  },

  {
    path: 'skill-categories/create',
    canActivate: [roleGuard],
    data: { roles: ['admin'] },
    loadComponent: () =>
      import('../features/skill-categories/create-skill-category/create-skill-category').then(
        (c) => c.CreateSkillCategory,
      ),
  },

  {
    path: 'skill-categories/:id/edit',
    canActivate: [roleGuard],
    data: { roles: ['admin'] },
    loadComponent: () =>
      import('../features/skill-categories/edit-skill-category/edit-skill-category').then(
        (c) => c.EditSkillCategory,
      ),
  },

  {
    path: 'skill-categories/:id/skills',
    canActivate: [roleGuard],
    data: { roles: ['admin'] },
    loadComponent: () =>
      import('../features/skill-categories/view-category-skills/view-category-skills').then(
        (c) => c.ViewCategorySkills,
      ),
  },

  {
    path: 'company-skill-categories',
    canActivate: [roleGuard],
    data: { roles: ['company'] },
    loadComponent: () =>
      import('../features/company-skill-categories/company-skill-category-list/company-skill-category-list').then(
        (c) => c.CompanySkillCategoryList,
      ),
  },

  {
    path: 'manage-categories',
    canActivate: [roleGuard],
    data: { roles: ['company'] },
    loadComponent: () =>
      import('../features/company-skill-categories/manage-categories/manage-categories').then(
        (c) => c.ManageCategoriesComponent,
      ),
  },

  {
    path: 'organisation',
    canActivate: [roleGuard],
    data: { roles: ['company'] },
    loadComponent: () =>
      import('../features/organisation/organisation-details/organisation-details').then(
        (c) => c.OrganisationDetailsPage,
      ),
  },

  // Company Skills (Company only)
  {
    path: 'company-skills',
    canActivate: [roleGuard],
    data: { roles: ['company'] },
    loadComponent: () =>
      import('../features/company-skills/company-skills').then((c) => c.CompanySkills),
  },

  {
    path: 'company-skills/create',
    canActivate: [roleGuard],
    data: { roles: ['company'] },
    loadComponent: () =>
      import('../features/skills/create-skill/create-skill').then((c) => c.CreateSkill),
  },

  {
    path: 'company-skills/:id/edit',
    canActivate: [roleGuard],
    data: { roles: ['company'] },
    loadComponent: () =>
      import('../features/skills/edit-skill/edit-skill').then((c) => c.EditSkill),
  },

  // Skills Routes (Admin only - for viewing all skills)
  {
    path: 'skills',
    canActivate: [roleGuard],
    data: { roles: ['admin'] },
    loadComponent: () =>
      import('../features/skills/skill-list/skill-list').then((c) => c.SkillList),
  },

  {
    path: 'skills/create',
    canActivate: [roleGuard],
    data: { roles: ['admin'] },
    loadComponent: () =>
      import('../features/skills/create-skill/create-skill').then((c) => c.CreateSkill),
  },

  {
    path: 'skills/:id/edit',
    canActivate: [roleGuard],
    data: { roles: ['admin'] },
    loadComponent: () =>
      import('../features/skills/edit-skill/edit-skill').then((c) => c.EditSkill),
  },

  // Questionnaire routes (Company role only)
  {
    path: 'questionnaires',
    canActivate: [roleGuard],
    data: { roles: ['company'] },
    loadComponent: () =>
      import('../features/questionnaires/questionnaire-list/questionnaire-list').then(
        (c) => c.QuestionnaireList,
      ),
  },

  {
    path: 'questionnaires/create',
    canActivate: [roleGuard],
    data: { roles: ['company'] },
    loadComponent: () =>
      import('../features/questionnaires/create-questionnaire/create-questionnaire').then(
        (c) => c.CreateQuestionnaire,
      ),
  },

  {
    path: 'questionnaires/:id/edit',
    canActivate: [roleGuard],
    data: { roles: ['company'] },
    loadComponent: () =>
      import('../features/questionnaires/edit-questionnaire/edit-questionnaire').then(
        (c) => c.EditQuestionnaire,
      ),
  },

  {
    path: 'questionnaires/:id/assign',
    canActivate: [roleGuard],
    data: { roles: ['company'] },
    loadComponent: () =>
      import('../features/questionnaires/assign-questionnaire/assign-questionnaire').then(
        (c) => c.AssignQuestionnaire,
      ),
  },

  {
    path: 'questionnaires/:id/responses',
    canActivate: [roleGuard],
    data: { roles: ['company'] },
    loadComponent: () =>
      import('../features/questionnaires/questionnaire-responses/questionnaire-responses').then(
        (c) => c.QuestionnaireResponses,
      ),
  },

  // Questionnaire routes (Employee role only)
  {
    path: 'my-questionnaires',
    canActivate: [roleGuard],
    data: { roles: ['employee'] },
    loadComponent: () =>
      import('../features/questionnaires/my-questionnaires/my-questionnaires').then(
        (c) => c.MyQuestionnaires,
      ),
  },

  {
    path: 'questionnaires/:id/submit',
    canActivate: [roleGuard],
    data: { roles: ['employee'] },
    loadComponent: () =>
      import('../features/questionnaires/submit-questionnaire/submit-questionnaire').then(
        (c) => c.SubmitQuestionnaire,
      ),
  },

  // My Skills route (Employee only - employees manage their own skills)
  {
    path: 'my-skills',
    canActivate: [roleGuard],
    data: { roles: ['employee'] },
    loadComponent: () =>
      import('../features/skills/skill-list/skill-list').then((c) => c.SkillList),
  },

  {
    path: 'my-skills/create',
    canActivate: [roleGuard],
    data: { roles: ['employee'] },
    loadComponent: () =>
      import('../features/skills/create-skill/create-skill').then((c) => c.CreateSkill),
  },

  {
    path: 'my-skills/:id/edit',
    canActivate: [roleGuard],
    data: { roles: ['employee'] },
    loadComponent: () =>
      import('../features/skills/edit-skill/edit-skill').then((c) => c.EditSkill),
  },

  // My Employees route (Company only)
  {
    path: 'my-employees',
    canActivate: [roleGuard],
    data: { roles: ['company'] },
    loadComponent: () =>
      import('../features/placeholder/placeholder').then((c) => c.PlaceholderComponent),
  },

  // Global Employee Search (Admin and Company)
  {
    path: 'employee-search',
    canActivate: [roleGuard],
    data: { roles: ['admin', 'company'] },
    loadComponent: () =>
      import('../features/employee-search/employee-search').then((c) => c.EmployeeSearch),
  },

  // Admin Global Search (Admin only)
  {
    path: 'admin-global-search',
    canActivate: [roleGuard],
    data: { roles: ['admin'] },
    loadComponent: () =>
      import('../features/admin-global-search/admin-global-search').then(
        (c) => c.AdminGlobalSearchComponent,
      ),
  },

  // Admin Skill Category Analytics (Admin only)
  {
    path: 'admin-skill-category-analytics',
    canActivate: [roleGuard],
    data: { roles: ['admin'] },
    loadComponent: () =>
      import('../features/admin-analytics/skill-category-analytics').then(
        (c) => c.SkillCategoryAnalyticsComponent,
      ),
  },

  // Admin Skill Analytics (Admin only)
  {
    path: 'admin-skill-analytics',
    canActivate: [roleGuard],
    data: { roles: ['admin'] },
    loadComponent: () =>
      import('../features/admin-analytics/skill-analytics').then(
        (c) => c.SkillAnalyticsComponent,
      ),
  },

  // Admin Company Analytics (Admin only)
  {
    path: 'admin-company-analytics',
    canActivate: [roleGuard],
    data: { roles: ['admin'] },
    loadComponent: () =>
      import('../features/admin-analytics/company-analytics').then(
        (c) => c.CompanyAnalyticsComponent,
      ),
  },

  // Admin Employee Analytics (Admin only)
  {
    path: 'admin-employee-analytics',
    canActivate: [roleGuard],
    data: { roles: ['admin'] },
    loadComponent: () =>
      import('../features/admin-analytics/employee-analytics').then(
        (c) => c.EmployeeAnalyticsComponent,
      ),
  },

  // Opportunities (Employee and Company)
  {
    path: 'opportunities',
    canActivate: [roleGuard],
    data: { roles: ['employee', 'company'] },
    loadComponent: () =>
      import('../features/placeholder/placeholder').then((c) => c.PlaceholderComponent),
  },

  // Talent Search (Admin and Company)
  {
    path: 'talent-search',
    canActivate: [roleGuard],
    data: { roles: ['admin', 'company'] },
    loadComponent: () =>
      import('../features/placeholder/placeholder').then((c) => c.PlaceholderComponent),
  },

  // AI Insights (All roles)
  {
    path: 'ai-insights',
    loadComponent: () =>
      import('../features/placeholder/placeholder').then((c) => c.PlaceholderComponent),
  },

  // Reports (Admin and Company)
  {
    path: 'reports',
    canActivate: [roleGuard],
    data: { roles: ['admin', 'company'] },
    loadComponent: () =>
      import('../features/placeholder/placeholder').then((c) => c.PlaceholderComponent),
  },

  // Settings (Admin only)
  {
    path: 'settings',
    canActivate: [roleGuard],
    data: { roles: ['admin'] },
    loadComponent: () =>
      import('../features/placeholder/placeholder').then((c) => c.PlaceholderComponent),
  },

  // System Settings (Admin only)
  {
    path: 'system-settings',
    canActivate: [roleGuard],
    data: { roles: ['admin'] },
    loadComponent: () =>
      import('../features/system-settings/system-settings').then((c) => c.SystemSettingsComponent),
  },

  // Notifications routes (Company only)
  {
    path: 'notifications',
    canActivate: [roleGuard],
    data: { roles: ['company'] },
    loadComponent: () =>
      import('../features/company-notifications/notification-list/notification-list').then(
        (c) => c.NotificationList,
      ),
  },

  {
    path: 'notifications/create',
    canActivate: [roleGuard],
    data: { roles: ['company'] },
    loadComponent: () =>
      import('../features/company-notifications/create-notification/create-notification').then(
        (c) => c.CreateNotification,
      ),
  },

  {
    path: 'notifications/edit/:id',
    canActivate: [roleGuard],
    data: { roles: ['company'] },
    loadComponent: () =>
      import('../features/company-notifications/create-notification/create-notification').then(
        (c) => c.CreateNotification,
      ),
  },

  {
    path: 'notifications/view/:id',
    canActivate: [roleGuard],
    data: { roles: ['company'] },
    loadComponent: () =>
      import('../features/company-notifications/create-notification/create-notification').then(
        (c) => c.CreateNotification,
      ),
  },

  // Unified notifications page - routes to correct component based on role
  {
    path: 'my-notifications',
    canActivate: [roleGuard],
    data: { roles: ['employee', 'company'] },
    loadComponent: () =>
      import('../features/notifications-unified/notifications-unified').then(
        (c) => c.NotificationsUnified,
      ),
  },

  // Admin Notifications routes (Admin only)
  {
    path: 'admin-notifications',
    canActivate: [roleGuard],
    data: { roles: ['admin'] },
    loadComponent: () =>
      import('../features/admin-notifications/notification-list/notification-list').then(
        (c) => c.AdminNotificationListComponent,
      ),
  },

  {
    path: 'admin-notifications/create',
    canActivate: [roleGuard],
    data: { roles: ['admin'] },
    loadComponent: () =>
      import('../features/admin-notifications/create-notification/create-notification').then(
        (c) => c.CreateAdminNotificationComponent,
      ),
  },

  {
    path: 'admin-notifications/edit/:id',
    canActivate: [roleGuard],
    data: { roles: ['admin'] },
    loadComponent: () =>
      import('../features/admin-notifications/create-notification/create-notification').then(
        (c) => c.CreateAdminNotificationComponent,
      ),
  },

  {
    path: 'admin-notifications/view/:id',
    canActivate: [roleGuard],
    data: { roles: ['admin'] },
    loadComponent: () =>
      import('../features/admin-notifications/create-notification/create-notification').then(
        (c) => c.CreateAdminNotificationComponent,
      ),
  },

  {
    path: 'notifications/:id/edit',
    canActivate: [roleGuard],
    data: { roles: ['company'] },
    loadComponent: () =>
      import('../features/company-notifications/edit-notification/edit-notification').then(
        (c) => c.EditNotification,
      ),
  },

  // Document Requirements (Company only)
  {
    path: 'document-requirements',
    canActivate: [roleGuard],
    data: { roles: ['company'] },
    loadComponent: () =>
      import('../features/company-document-requirements/company-document-requirements').then(
        (c) => c.CompanyDocumentRequirements,
      ),
  },

  // Document Review (Company only)
  {
    path: 'document-review',
    canActivate: [roleGuard],
    data: { roles: ['company'] },
    loadComponent: () =>
      import('../features/company-document-review/company-document-review').then(
        (c) => c.CompanyDocumentReview,
      ),
  },
];
