import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createCompanyCategorySchema = z.object({
  categoryId: z
    .string()
    .regex(objectIdRegex, 'Invalid category ID'),
});

export const updateCompanyCategorySchema = z.object({
  enabled: z
    .boolean()
    .default(false),
});

export const companyCategoryIdParamSchema = z.object({
  id: z
    .string()
    .regex(objectIdRegex, 'Invalid company category ID'),
});
