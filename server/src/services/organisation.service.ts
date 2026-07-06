import { CreateOrganisationDto } from '../dto/create-organisation.dto';

import { organisationRepository } from '../repositories/organisation.repository';
import { userRepository } from '../repositories/user.repository';

export const organisationService = {

    getAllOrganisations: async () => {

        return await organisationRepository.findAll();

    },

    getOrganisationById: async (
        id: string
    ) => {

        const organisation =
            await organisationRepository.findById(id);

        if (!organisation) {

            throw new Error(
                'Organisation not found'
            );

        }

        return organisation;

    },

    createOrganisation: async (
        ownerUserId: string,
        payload: CreateOrganisationDto
    ) => {

        const existingOrganisation =
            await organisationRepository.findByOwnerUserId(
                ownerUserId
            );

        if (existingOrganisation) {

            throw new Error(
                'Organisation already exists'
            );

        }

        const tenantId =
            `company-${Date.now()}`;

        const organisation =
            await organisationRepository.create({

                ...payload,

                ownerUserId,

                tenantId,

            });

        await userRepository.update(
            ownerUserId,
            {

                organisationId:
                    organisation._id.toString(),

                tenantId,

                profileCompleted: true,

                onboardingStatus: 'completed'

            }
        );

        return organisation;

    },

    updateOrganisation: async (

        id: string,

        payload: Partial<CreateOrganisationDto>

    ) => {

        const existingOrganisation =
            await organisationRepository.findById(id);

        if (!existingOrganisation) {

            throw new Error(
                'Organisation not found'
            );

        }

        return await organisationRepository.update(
            id,
            payload
        );

    },

    deleteOrganisation: async (
        id: string
    ) => {

        const existingOrganisation =
            await organisationRepository.findById(id);

        if (!existingOrganisation) {

            throw new Error(
                'Organisation not found'
            );

        }

        await organisationRepository.delete(id);

        return;

    }

};