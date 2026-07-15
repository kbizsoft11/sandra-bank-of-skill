import { Schema, model } from 'mongoose';
import { IRole } from '../types/role.types';

const RoleSchema = new Schema<IRole>(
    {
        designationName: {
            type: String,
            required: true,
            trim: true,
        },

        description: {
            type: String,
            trim: true,
        },

        tenantId: {
            type: String,
            required: true,
            index: true,
        },

        organisationId: {
            type: String,
            required: true,
            index: true,
        },

        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

// Compound index for tenant-based queries
RoleSchema.index({ tenantId: 1, organisationId: 1 });

export const RoleModel = model<IRole>('Role', RoleSchema);
