import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createSkillSchema = z.object({

    cat_id: z
        .string()
        .min(1, "Category is required.")
        .regex(objectIdRegex, "Invalid category id."),

    user_id: z
        .string()
        .min(1, "User is required.")
        .regex(objectIdRegex, "Invalid user id."),

    skill_name: z
        .string()
        .trim()
        .min(2, "Skill name must be at least 2 characters.")
        .max(100, "Skill name cannot exceed 100 characters."),

    skill_desc: z
        .string()
        .trim()
        .max(500, "Skill description cannot exceed 500 characters.")
        .optional(),

    skill_level: z
        .string()
        .trim()
        .min(1, "Skill level is required."),

    skill_score: z
        .number()
        .min(0, "Skill score cannot be less than 0.")
        .max(100, "Skill score cannot be greater than 100.")
        .optional(),

});

export const updateSkillSchema = z.object({
    cat_id: z
        .string()
        .regex(objectIdRegex, "Invalid category id.")
        .optional(),

    user_id: z
        .string()
        .regex(objectIdRegex, "Invalid user id.")
        .optional(),

    skill_name: z
        .string()
        .trim()
        .min(2, "Skill name must be at least 2 characters.")
        .max(100, "Skill name cannot exceed 100 characters.")
        .optional(),

    skill_desc: z
        .string()
        .trim()
        .max(500, "Skill description cannot exceed 500 characters.")
        .optional(),

    skill_level: z
        .string()
        .trim()
        .min(1, "Skill level is required.")
        .optional(),

    skill_score: z
        .number()
        .min(0, "Skill score cannot be less than 0.")
        .max(100, "Skill score cannot be greater than 100.")
        .optional(),
});

export const skillIdParamSchema = z.object({
    id: z.string().regex(objectIdRegex, "Invalid skill id."),
});

export const getSkillsQuerySchema = z.object({
    page: z.coerce.number().optional(),
    limit: z.coerce.number().optional(),
    search: z.string().optional(),
    cat_id: z.string().optional(),
    user_id: z.string().optional(),
    skill_level: z.string().optional(),
});