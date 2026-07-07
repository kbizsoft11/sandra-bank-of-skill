import { Schema, model } from "mongoose";
import { IUser } from "../types/user.types";

const UserSchema = new Schema<IUser>(
    {
        firstName: {
            type: String,
            required: true,
            trim: true,
        },

        lastName: {
            type: String,
            required: false,
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