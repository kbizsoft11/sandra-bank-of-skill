/**
 * Activity Types Constants
 * Define all essential action types that should be logged
 * Only log actions that are important for audit, security, or compliance
 */

export const ACTIVITY_TYPES = {
  // Authentication & Access
  LOGIN: 'login',
  LOGOUT: 'logout',
  PASSWORD_RESET: 'password_reset',
  EMAIL_VERIFY: 'email_verify',
  ACCOUNT_ACTIVATE: 'account_activate',
  ACCOUNT_DEACTIVATE: 'account_deactivate',

  // Resource Management
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  ASSIGN: 'assign',
  UNASSIGN: 'unassign',

  // Data Access & Operations
  VIEW: 'view', // Only for restricted data access
  EXPORT: 'export', // Data exports
  IMPORT: 'import', // Data imports
  BULK_ACTION: 'bulk_action', // Bulk operations

  // System Operations
  SYSTEM_CONFIG: 'system_config', // System settings changes
} as const;

export const RESOURCE_TYPES = {
  // User Management
  USER: 'user',
  COMPANY: 'company',

  // Skill Management
  SKILL: 'skill',
  SKILL_CATEGORY: 'skill_category',

  // Learning
  COURSE: 'course',
  ASSESSMENT: 'assessment',
  QUESTIONNAIRE: 'questionnaire',

  // Documents
  DOCUMENT: 'document',
  DOCUMENT_REQUIREMENT: 'document_requirement',

  // System
  SYSTEM_SETTINGS: 'system_settings',
} as const;

export const ACTIVITY_STATUS = {
  SUCCESS: 'success',
  FAILURE: 'failure',
  PENDING: 'pending',
} as const;

/**
 * Activity logging configuration - defines which actions are essential and should be logged
 * Format: { [resource]: [actionTypes] }
 */
export const ESSENTIAL_ACTIVITIES = {
  [RESOURCE_TYPES.USER]: [
    ACTIVITY_TYPES.LOGIN,
    ACTIVITY_TYPES.LOGOUT,
    ACTIVITY_TYPES.PASSWORD_RESET,
    ACTIVITY_TYPES.EMAIL_VERIFY,
    ACTIVITY_TYPES.ACCOUNT_ACTIVATE,
    ACTIVITY_TYPES.ACCOUNT_DEACTIVATE,
    ACTIVITY_TYPES.CREATE, // Admin creates user
    ACTIVITY_TYPES.UPDATE, // User updates their profile
    ACTIVITY_TYPES.DELETE, // Admin deletes user
  ],

  [RESOURCE_TYPES.COMPANY]: [
    ACTIVITY_TYPES.CREATE, // Admin creates company
    ACTIVITY_TYPES.UPDATE, // Company updates settings
    ACTIVITY_TYPES.DELETE, // Admin deletes company
  ],

  [RESOURCE_TYPES.SKILL]: [
    ACTIVITY_TYPES.CREATE, // Admin/Company creates skill
    ACTIVITY_TYPES.UPDATE, // Admin/Company updates skill
    ACTIVITY_TYPES.DELETE, // Admin/Company deletes skill
    ACTIVITY_TYPES.ASSIGN, // Assign skill to category
    ACTIVITY_TYPES.UNASSIGN, // Remove skill from category
    ACTIVITY_TYPES.BULK_ACTION, // Bulk operations on skills
  ],

  [RESOURCE_TYPES.SKILL_CATEGORY]: [
    ACTIVITY_TYPES.CREATE, // Admin/Company creates category
    ACTIVITY_TYPES.UPDATE, // Admin/Company updates category
    ACTIVITY_TYPES.DELETE, // Admin/Company deletes category
  ],

  [RESOURCE_TYPES.COURSE]: [
    ACTIVITY_TYPES.CREATE,
    ACTIVITY_TYPES.UPDATE,
    ACTIVITY_TYPES.DELETE,
  ],

  [RESOURCE_TYPES.ASSESSMENT]: [
    ACTIVITY_TYPES.CREATE,
    ACTIVITY_TYPES.UPDATE,
    ACTIVITY_TYPES.DELETE,
    ACTIVITY_TYPES.VIEW, // Track who views assessments
  ],

  [RESOURCE_TYPES.QUESTIONNAIRE]: [
    ACTIVITY_TYPES.CREATE,
    ACTIVITY_TYPES.UPDATE,
    ACTIVITY_TYPES.DELETE,
  ],

  [RESOURCE_TYPES.DOCUMENT]: [
    ACTIVITY_TYPES.CREATE,
    ACTIVITY_TYPES.UPDATE,
    ACTIVITY_TYPES.DELETE,
    ACTIVITY_TYPES.EXPORT,
    ACTIVITY_TYPES.IMPORT,
  ],

  [RESOURCE_TYPES.DOCUMENT_REQUIREMENT]: [
    ACTIVITY_TYPES.CREATE,
    ACTIVITY_TYPES.UPDATE,
    ACTIVITY_TYPES.DELETE,
  ],

  [RESOURCE_TYPES.SYSTEM_SETTINGS]: [
    ACTIVITY_TYPES.UPDATE, // Track all system settings changes
    ACTIVITY_TYPES.SYSTEM_CONFIG,
  ],
} as const;

/**
 * Helper function to check if an activity should be logged
 */
export function isEssentialActivity(
  resource: string,
  actionType: string
): boolean {
  const resourceActivities =
    ESSENTIAL_ACTIVITIES[resource as keyof typeof ESSENTIAL_ACTIVITIES];

  if (!resourceActivities) {
    return false; // Don't log if resource type not recognized
  }

  return resourceActivities.includes(actionType as any);
}
