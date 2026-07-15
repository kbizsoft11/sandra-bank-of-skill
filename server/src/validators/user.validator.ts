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