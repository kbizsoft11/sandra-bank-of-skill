import { z } from 'zod';

const objectIdRegex =
    /^[0-9a-fA-F]{24}$/;

export const createUserSchema = z.object({

    fullName: z
        .string()
        .trim()
        .min(2)
        .max(100),

    email: z
        .email(),

    password: z
        .string()
        .min(6),

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