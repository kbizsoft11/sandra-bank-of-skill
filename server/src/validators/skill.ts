import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createSkillSchema = z.object({
  name: z
    .string()
    .min(1, 'Skill name is required')
    .max(100, 'Skill name cannot exceed 100 characters'),

  description: z
    .string()
    .max(500, 'Description cannot exceed 500 characters')
    .optional(),

  categoryId: z
    .string()
    .regex(objectIdRegex, 'Invalid category ID'),
});

export const updateSkillSchema = z.object({
  name: z
    .string()
    .min(1, 'Skill name is required')
    .max(100, 'Skill name cannot exceed 100 characters')
    .optional(),

  description: z
    .string()
    .max(500, 'Description cannot exceed 500 characters')
    .optional(),

  categoryId: z
    .string()
    .regex(objectIdRegex, 'Invalid category ID')
    .optional(),

  status: z
    .enum(['active', 'inactive'])
    .optional(),
});

export const archiveSkillSchema = z.object({
  archived: z
    .boolean()
    .default(false),
});

export const skillIdParamSchema = z.object({
  id: z
    .string()
    .regex(objectIdRegex, 'Invalid skill ID'),
});
