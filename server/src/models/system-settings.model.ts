import { Schema, model, Document } from 'mongoose';

export interface ISystemSettings extends Document {
  // General Settings
  platformName?: string;
  logo?: string; // Base64 or URL
  favicon?: string; // Base64 or URL
  supportEmail?: string;

  // Email Settings
  smtpHost?: string;
  smtpPort?: number;
  smtpUsername?: string;
  smtpPassword?: string; // Stored encrypted
  fromEmail?: string;

  // Security Settings
  jwtExpiry?: string; // e.g., "7d", "24h"
  passwordPolicy?: {
    minLength?: number;
    requireUppercase?: boolean;
    requireLowercase?: boolean;
    requireNumbers?: boolean;
    requireSpecialChars?: boolean;
  };
  sessionTimeout?: number; // in minutes

  createdAt: Date;
  updatedAt: Date;
}

const systemSettingsSchema = new Schema<ISystemSettings>(
  {
    // General Settings
    platformName: {
      type: String,
      default: 'Bank of Skill',
      trim: true,
    },
    logo: {
      type: String,
      default: '',
    },
    favicon: {
      type: String,
      default: '',
    },
    supportEmail: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email format'],
    },

    // Email Settings
    smtpHost: {
      type: String,
      trim: true,
      default: '',
    },
    smtpPort: {
      type: Number,
      default: 587,
      min: 1,
      max: 65535,
    },
    smtpUsername: {
      type: String,
      trim: true,
      default: '',
    },
    smtpPassword: {
      type: String,
      default: '',
      select: false, // Don't return password by default
    },
    fromEmail: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email format'],
    },

    // Security Settings
    jwtExpiry: {
      type: String,
      default: '7d',
      enum: ['1d', '3d', '7d', '14d', '30d'],
    },
    passwordPolicy: {
      type: {
        minLength: { type: Number, default: 8, min: 6, max: 32 },
        requireUppercase: { type: Boolean, default: true },
        requireLowercase: { type: Boolean, default: true },
        requireNumbers: { type: Boolean, default: true },
        requireSpecialChars: { type: Boolean, default: false },
      },
      default: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: false,
      },
    },
    sessionTimeout: {
      type: Number,
      default: 30, // 30 minutes
      min: 5,
      max: 1440, // 24 hours
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const SystemSettings = model<ISystemSettings>('SystemSettings', systemSettingsSchema);
