import dotenv from 'dotenv';
import { StringValue } from 'ms';

dotenv.config();

export const env = {
  // Server Configuration
  PORT: process.env.PORT || '5000',
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Database Configuration
  MONGO_URI: process.env.MONGO_URI!,
  
  // JWT Configuration
  JWT_SECRET: process.env.JWT_SECRET!,
  JWT_EXPIRES_IN: (process.env.JWT_EXPIRES_IN || '7d') as StringValue,
  
  // Email Configuration (SMTP)
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_SECURE: process.env.SMTP_SECURE === 'true',
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASSWORD: process.env.SMTP_PASSWORD || '',
  SMTP_SERVICE: process.env.SMTP_SERVICE,
  EMAIL_FROM: process.env.EMAIL_FROM || 'Bank of Skill <noreply@bankofskill.com>',
  
  // OTP Configuration
  OTP_EXPIRY_MINUTES: parseInt(process.env.OTP_EXPIRY_MINUTES || '10', 10),
  MAX_OTP_RESEND_ATTEMPTS: parseInt(process.env.MAX_OTP_RESEND_ATTEMPTS || '3', 10),
  OTP_RESEND_COOLDOWN_SECONDS: parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS || '30', 10),
  
  // Registration Configuration
  REGISTRATION_EXPIRY_HOURS: parseInt(process.env.REGISTRATION_EXPIRY_HOURS || '24', 10),
  
  // Client Configuration
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:4200',
};