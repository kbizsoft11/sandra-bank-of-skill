import { Schema, model } from "mongoose";
import { IUser } from "../types/user.types";

const UserSchema = new Schema<IUser>(
    {
        fullName: {
            type: String,
            required: true,
            trim: true,
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },

        phone: {
            type: String,
            required: false,
            trim: true,
        },

        password: {
            type: String,
            required: true,
        },

        role: {
            type: String,
            enum: [
                "admin",
                "company",
                "employee"
            ],
            default: 'employee',
        },

        tenantId: {
            type: String,
        },

        organisationId: {
            type: String,
        },

        designationId: {
            type: String,
        },

        department: {
            type: String,
        },

        location: {
            type: String,
        },

        profileCompleted: {
            type: Boolean,
            default: false,
        },

        hasCompletedOnboarding: {
            type: Boolean,
            default: false,
            index: true,
        },

        emailVerified: {
            type: Boolean,
            default: false,
        },

        verificationCode: {
            type: String,
        },

        verificationCodeExpiresAt: {
            type: Date,
        },

        onboardingStatus: {
            type: String,
            enum: [
                'registered',
                'email_verified',
                'completed'
            ],
            default: 'registered',
        },

        isActive: {
            type: Boolean,
            default: true
        },

        accountStatus: {
            type: String,
            enum: ['invited', 'joined', 'active', 'inactive', 'suspended'],
            default: 'active',
        },

        invitedAt: {
            type: Date,
        },

        lastLoginAt: {
            type: Date,
        },

        profileImage: {
            type: String,
            required: false,
        },

        title: {
            type: String,
            required: false,
            trim: true,
        },

        bio: {
            type: String,
            required: false,
            trim: true,
        },

        socialLinks: {
            facebook: {
                type: String,
                required: false,
            },
            twitter: {
                type: String,
                required: false,
            },
            linkedin: {
                type: String,
                required: false,
            },
        }

    },

    {
        timestamps: true,
    }
);

export const UserModel = model<IUser>(
    'User',
    UserSchema
);