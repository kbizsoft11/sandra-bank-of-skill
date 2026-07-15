import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createRoleSchema = z.object({
    designationName: z
        .string()
        .trim()
        .min(2, 'Designation name must be at least 2 characters')
        .max(100, 'Designation name must not exceed 100 characters'),

    description: z
        .string()
        .trim()
        .max(500, 'Description must not exceed 500 characters')
        .optional(),
});

export const updateRoleSchema = z.object({
    designationName: z
        .string()
        .trim()
        .min(2, 'Designation name must be at least 2 characters')
        .max(100, 'Designation name must not exceed 100 characters')
        .optional(),

    description: z
        .string()
        .trim()
        .max(500, 'Description must not exceed 500 characters')
        .optional(),

    isActive: z
        .boolean()
        .optional(),
});

export const roleIdParamSchema = z.object({
    id: z
        .string()
        .regex(objectIdRegex, 'Invalid role id'),
});

export const getRolesQuerySchema = z.object({
    isActive: z
        .string()
        .optional()
        .transform((val) => {
            if (val === undefined || val === '') return undefined;
            return val === 'true';
        }),
});
