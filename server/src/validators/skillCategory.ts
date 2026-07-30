import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createSkillCategorySchema = z.object({
  name: z
    .string()
    .min(1, 'Category name is required')
    .max(100, 'Category name cannot exceed 100 characters'),

  description: z
    .string()
    .max(500, 'Description cannot exceed 500 characters')
    .optional(),
});

export const updateSkillCategorySchema = z.object({
  name: z
    .string()
    .min(1, 'Category name is required')
    .max(100, 'Category name cannot exceed 100 characters')
    .optional(),

  description: z
    .string()
    .max(500, 'Description cannot exceed 500 characters')
    .optional(),

  status: z
    .enum(['active', 'inactive'])
    .optional(),
});

export const archiveSkillCategorySchema = z.object({
  archived: z
    .boolean()
    .default(false),
});

export const skillCategoryIdParamSchema = z.object({
  id: z
    .string()
    .regex(objectIdRegex, 'Invalid category ID'),
});
