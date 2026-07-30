import { z } from 'zod';

export const createSkillCategorySchema = z.object({
  name: z
    .string()
    .min(1, 'Category name is required')
    .max(100, 'Category name cannot exceed 100 characters'),

  description: z
    .string()
    .max(500, 'Description cannot exceed 500 characters')
    .optional(),

  status: z
    .enum(['active', 'inactive'])
    .optional()
    .default('active'),
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
