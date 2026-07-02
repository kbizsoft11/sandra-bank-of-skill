import { z } from 'zod';

export const createSkillCategorySchema = z.object({
  cat_name: z
    .string()
    .min(1, 'Category name is required'),

  cat_desc: z
    .string()
    .optional(),
});

export const updateSkillCategorySchema = z.object({
  cat_name: z
    .string()
    .min(1, 'Category name is required')
    .optional(),

  cat_desc: z
    .string()
    .optional(),
});
