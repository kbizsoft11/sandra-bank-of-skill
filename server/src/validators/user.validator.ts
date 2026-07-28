import { z } from 'zod';

const objectIdRegex =
    /^[0-9a-fA-F]{24}$/;

export const createUserSchema = z.object({

    fullName: z
        .string()
        .trim()
        .min(2, 'Full name must be at least 2 characters')
        .max(100, 'Full name must not exceed 100 characters'),

    email: z
        .email('Invalid email format'),

    password: z
        .string()
        .optional()
        .describe('Password is auto-generated for company users'),

    role: z
        .literal('company')
        .describe('Only company users can be created via admin'),

    tenantId: z
        .string()
        .optional()
        .describe('TenantId is auto-generated for company users'),

    profileCompleted: z
        .boolean()
        .optional(),

    isActive: z
        .boolean()
        .optional(),

});

export const updateUserSchema = z.object({

    fullName: z
        .string()
        .trim()
        .min(2)
        .max(100)
        .optional(),

    email: z
        .email()
        .optional(),

    role: z
        .enum([
            'admin',
            'company',
            'employee'
        ])
        .optional(),

    tenantId: z
        .string()
        .optional(),

    profileCompleted: z
        .boolean()
        .optional(),

    isActive: z
        .boolean()
        .optional(),

});

export const userIdParamSchema = z.object({

    id: z
        .string()
        .regex(
            objectIdRegex,
            'Invalid user id.'
        ),

});

export const getUsersQuerySchema = z.object({

    page: z
        .coerce
        .number()
        .optional(),

    limit: z
        .coerce
        .number()
        .optional(),

    search: z
        .string()
        .optional(),

});

export const inviteUserSchema = z.object({

    email: z
        .string()
        .email('Invalid email address'),

    role: z
        .enum([
            'admin',
            'company',
            'employee'
        ])
        .optional()
        .default('employee')
        .describe('Role defaults to employee for invited users'),

    fullName: z
        .string()
        .trim()
        .min(2)
        .max(100)
        .optional(),

    designationId: z
        .string()
        .optional(),

    message: z
        .string()
        .min(10, 'Message must be at least 10 characters')
        .max(1000, 'Message must not exceed 1000 characters')
        .optional(),

});

export const updateProfileSchema = z.object({

    fullName: z
        .string()
        .trim()
        .min(2)
        .max(100)
        .optional(),

    title: z
        .string()
        .trim()
        .max(100)
        .optional(),

    bio: z
        .string()
        .trim()
        .max(500)
        .optional(),

    socialLinks: z.object({
        facebook: z.string().url().optional().or(z.literal('')),
        twitter: z.string().url().optional().or(z.literal('')),
        linkedin: z.string().url().optional().or(z.literal('')),
    }).optional(),

});

export const changePasswordRequestSchema = z.object({
    email: z.string().email('Invalid email format').optional(),
});

export const changePasswordVerifySchema = z.object({
    otp: z.string().trim().length(6, 'OTP must be exactly 6 digits').regex(/^\d{6}$/, 'OTP must contain only digits'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Password must be at least 8 characters'),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
});

export const searchEmployeesQuerySchema = z.object({

    search: z
        .string()
        .optional()
        .describe('Search by employee name or email'),

    skill: z
        .string()
        .optional()
        .describe('Filter by skill name'),

    category: z
        .string()
        .optional()
        .describe('Filter by skill category name'),

    department: z
        .string()
        .optional()
        .describe('Filter by department'),

    page: z
        .coerce
        .number()
        .positive()
        .optional()
        .default(1),

    limit: z
        .coerce
        .number()
        .positive()
        .max(100)
        .optional()
        .default(20),

    sortKey: z
        .string()
        .optional()
        .describe('Key to sort by'),

    sortDirection: z
        .enum(['asc', 'desc'])
        .optional()
        .describe('Sort direction'),

    status: z
        .string()
        .optional()
        .describe('Filter by employee account status (joined, active, inactive)'),

    accountStatus: z
        .string()
        .optional()
        .describe('Filter by exact account status (invited, joined, active, inactive)'),

    excludeAccountStatus: z
        .string()
        .optional()
        .describe('Exclude specific account status from the search results'),

});

export const allActivitiesQuerySchema = z.object({

    page: z
        .coerce
        .number()
        .positive()
        .optional()
        .default(1),

    limit: z
        .coerce
        .number()
        .positive()
        .max(100)
        .optional()
        .default(20),

    activityType: z
        .string()
        .optional()
        .describe('Filter by activity type (login, course, assessment, skill)'),

    employeeId: z
        .string()
        .regex(objectIdRegex, 'Invalid employee id')
        .optional()
        .describe('Filter by specific employee'),

    status: z
        .string()
        .optional()
        .describe('Filter by activity status'),

    search: z
        .string()
        .optional()
        .describe('Search activities'),

    dateRange: z
        .string()
        .optional()
        .describe('Date range filter (today, week, month, year)'),

    startDate: z
        .string()
        .optional()
        .describe('Start date for custom range'),

    endDate: z
        .string()
        .optional()
        .describe('End date for custom range'),

});
