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

        password: {
            type: String,
            required: true,
        },

        role: {
            type: String,
            required: true,
            default: 'employee',
        },

        tenantId: {
            type: String,
            required: true,
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