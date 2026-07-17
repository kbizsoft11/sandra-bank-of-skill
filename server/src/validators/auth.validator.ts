import { z } from 'zod';

// Legacy registration schema (keep for backward compatibility)
export const registerSchema = z.object({
    fullName: z.string().min(2, 'Name is required'),
    email: z.email('Invalid email address'),
    password: z
        .string()
        .min(6, 'Password must be at least 6 characters'),
});

// Login schema
export const loginSchema = z.object({
    email: z.email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});

// Step 1: Initial registration with validation
export const registerStep1Schema = z.object({
    fullName: z
        .string()
        .min(2, 'Full name must be at least 2 characters')
        .max(100, 'Full name must not exceed 100 characters')
        .trim(),
    email: z
        .string()
        .email('Invalid email address')
        .toLowerCase()
        .trim(),
    phone: z
        .string()
        .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format (E.164 format expected)')
        .trim(),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/,
            'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
        ),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});

// Step 2: OTP verification
export const verifyOTPSchema = z.object({
    email: z
        .string()
        .email('Invalid email address')
        .toLowerCase()
        .trim(),
    otp: z
        .string()
        .length(6, 'OTP must be exactly 6 digits')
        .regex(/^\d{6}$/, 'OTP must contain only digits'),
});

// Step 3: Organisation details
export const registerStep3Schema = z.object({
    organisationName: z
        .string()
        .min(2, 'Organisation name must be at least 2 characters')
        .max(200, 'Organisation name must not exceed 200 characters')
        .trim(),
    industry: z
        .string()
        .min(1, 'Please select an industry'),
    teamSize: z
        .string()
        .refine(
            (val) => [
                '1-10',
                '11-25',
                '26-50',
                '51-100',
                '101-250',
                '251-500',
                '500-1000',
                '1000+'
            ].includes(val),
            'Invalid team size selection'
        ),
    country: z
        .string()
        .min(2, 'Please select a country'),
});

// Resend OTP
export const resendOTPSchema = z.object({
    email: z
        .string()
        .email('Invalid email address')
        .toLowerCase()
        .trim(),
});

export const acceptInvitationSchema = z.object({
    token: z.string().min(1, 'Invitation token is required'),
    fullName: z.string().trim().min(2, 'Full name must be at least 2 characters'),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/,
            'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
        ),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});