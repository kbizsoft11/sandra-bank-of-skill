import { IRole } from '../types/role.types';
import { RoleModel } from '../models/role.model';

export interface CreateRoleDto {
    designationName: string;
    description?: string;
    tenantId: string;
    organisationId: string;
}

export interface UpdateRoleDto {
    designationName?: string;
    description?: string;
    isActive?: boolean;
}

export const roleRepository = {
    /**
     * Create a new role
     */
    create: async (payload: CreateRoleDto) => {
        return RoleModel.create(payload);
    },

    /**
     * Find all roles for a tenant/organisation
     */
    findAll: async (tenantId: string, organisationId: string, isActive?: boolean) => {
        const filter: any = { tenantId, organisationId };
        
        if (isActive !== undefined) {
            filter.isActive = isActive;
        }
        
        return RoleModel.find(filter).sort({ designationName: 1 });
    },

    /**
     * Find role by ID
     */
    findById: async (id: string) => {
        return RoleModel.findById(id);
    },

    /**
     * Find role by ID within tenant/organisation scope
     */
    findByIdInTenant: async (id: string, tenantId: string, organisationId: string) => {
        return RoleModel.findOne({ _id: id, tenantId, organisationId });
    },

    /**
     * Update role
     */
    update: async (id: string, payload: UpdateRoleDto) => {
        return RoleModel.findByIdAndUpdate(id, payload, { new: true });
    },

    /**
     * Delete role
     */
    delete: async (id: string) => {
        return RoleModel.findByIdAndDelete(id);
    },

    /**
     * Check if role exists by name in tenant/organisation
     */
    existsByName: async (designationName: string, tenantId: string, organisationId: string, excludeId?: string) => {
        const filter: any = {
            designationName: { $regex: new RegExp(`^${designationName}$`, 'i') },
            tenantId,
            organisationId,
        };

        if (excludeId) {
            filter._id = { $ne: excludeId };
        }

        const role = await RoleModel.findOne(filter);
        return !!role;
    },
};
