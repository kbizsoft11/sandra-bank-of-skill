import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createSkillUserSchema = z.object({
  userId: z
    .string()
    .regex(objectIdRegex, 'Invalid user ID'),

  skillId: z
    .string()
    .regex(objectIdRegex, 'Invalid skill ID'),

  score: z
    .number()
    .min(0, 'Score cannot be less than 0')
    .max(100, 'Score cannot exceed 100'),

  level: z
    .enum(['Beginner', 'Intermediate', 'Advanced', 'Expert'])
    .refine(val => val, 'Invalid skill level'),

  assessmentId: z
    .string()
    .regex(objectIdRegex, 'Invalid assessment ID')
    .optional(),

  questionnaireId: z
    .string()
    .regex(objectIdRegex, 'Invalid questionnaire ID')
    .optional(),
});

export const updateSkillUserSchema = z.object({
  score: z
    .number()
    .min(0, 'Score cannot be less than 0')
    .max(100, 'Score cannot exceed 100')
    .optional(),

  level: z
    .enum(['Beginner', 'Intermediate', 'Advanced', 'Expert'])
    .optional(),

  assessmentId: z
    .string()
    .regex(objectIdRegex, 'Invalid assessment ID')
    .optional(),

  lastAssessedAt: z
    .string()
    .datetime()
    .optional(),
});

export const skillUserIdParamSchema = z.object({
  id: z
    .string()
    .regex(objectIdRegex, 'Invalid skill user ID'),
});
