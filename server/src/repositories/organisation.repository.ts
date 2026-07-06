import { Organisation } from '../models/organisation.model';

import { IOrganisation } from '../types/organisation.types';

import { CreateOrganisationDto } from '../dto/create-organisation.dto';

export const organisationRepository = {

    create: async (
        payload: CreateOrganisationDto & {
            ownerUserId: string;
            tenantId: string;
        }
    ) => {

        return Organisation.create(
            payload
        );

    },

    findAll: async () => {

        return Organisation.find();

    },

    findById: async (
        id: string
    ) => {

        return Organisation.findById(
            id
        );

    },

    findByTenantId: async (
        tenantId: string
    ) => {

        return Organisation.findOne({
            tenantId
        });

    },

    findByOwnerUserId: async (
        ownerUserId: string
    ) => {

        return Organisation.findOne({
            ownerUserId
        });

    },

    update: async (
        id: string,
        payload: Partial<IOrganisation>
    ) => {

        return Organisation.findByIdAndUpdate(
            id,
            payload,
            {
                new: true
            }
        );

    },

    delete: async (
        id: string
    ) => {

        return Organisation.findByIdAndDelete(
            id
        );

    }

};