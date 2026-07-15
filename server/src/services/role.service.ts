import { roleRepository, CreateRoleDto, UpdateRoleDto } from '../repositories/role.repository';

export const roleService = {
    /**
     * Create a new role
     */
    createRole: async (payload: CreateRoleDto, tenantId: string, organisationId: string) => {
        // Check if role with same name already exists
        const exists = await roleRepository.existsByName(
            payload.designationName,
            tenantId,
            organisationId
        );

        if (exists) {
            throw new Error('A role with this designation name already exists');
        }

        const role = await roleRepository.create({
            ...payload,
            tenantId,
            organisationId,
        });

        return {
            message: 'Role created successfully',
            role,
        };
    },

    /**
     * Get all roles for a company
     */
    getAllRoles: async (tenantId: string, organisationId: string, isActive?: boolean) => {
        const roles = await roleRepository.findAll(tenantId, organisationId, isActive);
        return roles;
    },

    /**
     * Get role by ID
     */
    getRoleById: async (id: string, tenantId: string, organisationId: string) => {
        const role = await roleRepository.findByIdInTenant(id, tenantId, organisationId);

        if (!role) {
            throw new Error('Role not found');
        }

        return role;
    },

    /**
     * Update role
     */
    updateRole: async (
        id: string,
        payload: UpdateRoleDto,
        tenantId: string,
        organisationId: string
    ) => {
        // Check if role exists
        const role = await roleRepository.findByIdInTenant(id, tenantId, organisationId);

        if (!role) {
            throw new Error('Role not found');
        }

        // If updating designation name, check for duplicates
        if (payload.designationName) {
            const exists = await roleRepository.existsByName(
                payload.designationName,
                tenantId,
                organisationId,
                id
            );

            if (exists) {
                throw new Error('A role with this designation name already exists');
            }
        }

        const updatedRole = await roleRepository.update(id, payload);

        return {
            message: 'Role updated successfully',
            role: updatedRole,
        };
    },

    /**
     * Delete role
     */
    deleteRole: async (id: string, tenantId: string, organisationId: string) => {
        // Check if role exists
        const role = await roleRepository.findByIdInTenant(id, tenantId, organisationId);

        if (!role) {
            throw new Error('Role not found');
        }

        // TODO: Add check if role is assigned to any users
        // For now, we'll allow deletion

        await roleRepository.delete(id);

        return {
            message: 'Role deleted successfully',
        };
    },
};
