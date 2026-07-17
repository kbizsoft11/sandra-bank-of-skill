import { z } from 'zod';

export const createCompanySkillCategorySchema = z.object({
  skillCategoryId: z
    .string()
    .min(1, 'Skill category is required'),

  displayName: z
    .string()
    .min(1, 'Display name is required'),
});

export const updateCompanySkillCategorySchema = z.object({
  displayName: z
    .string()
    .min(1, 'Display name is required')
    .optional(),
});
