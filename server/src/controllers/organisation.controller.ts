import { Request, Response } from 'express';

import { organisationService } from '../services/organisation.service';

import { asyncHandler } from '../utils/async-handler';
import { sendResponse } from '../utils/api-response';

export const getAllOrganisations = asyncHandler(
    async (req: Request, res: Response) => {

        const organisations =
            await organisationService.getAllOrganisations();

        return sendResponse(
            res,
            200,
            'Organisations fetched successfully',
            organisations
        );

    }
);

export const getOrganisationById = asyncHandler(
    async (req: Request, res: Response) => {

        const organisation =
            await organisationService.getOrganisationById(
                req.params.id as string
            );

        return sendResponse(
            res,
            200,
            'Organisation fetched successfully',
            organisation
        );

    }
);

export const getMyOrganisation = asyncHandler(
    async (req: Request, res: Response) => {

        if (!req.user?.organisationId) {
            return sendResponse(
                res,
                404,
                'Organisation not found for current user',
                null
            );
        }

        const organisation =
            await organisationService.getOrganisationById(
                req.user.organisationId as string
            );

        return sendResponse(
            res,
            200,
            'Organisation fetched successfully',
            organisation
        );

    }
);

export const createOrganisation = asyncHandler(
    async (req: Request, res: Response) => {

        const organisation =
            await organisationService.createOrganisation(
                req.user.userId,
                req.body
            );

        return sendResponse(
            res,
            201,
            'Organisation created successfully',
            organisation
        );

    }
);

export const updateOrganisation = asyncHandler(
    async (req: Request, res: Response) => {

        const organisation =
            await organisationService.updateOrganisation(
                req.params.id as string,
                req.body
            );

        return sendResponse(
            res,
            200,
            'Organisation updated successfully',
            organisation
        );

    }
);

export const updateMyOrganisation = asyncHandler(
    async (req: Request, res: Response) => {

        if (!req.user?.organisationId) {
            return sendResponse(
                res,
                404,
                'Organisation not found for current user',
                null
            );
        }

        const organisation =
            await organisationService.updateOrganisation(
                req.user.organisationId as string,
                req.body
            );

        return sendResponse(
            res,
            200,
            'Organisation updated successfully',
            organisation
        );

    }
);

export const deleteOrganisation = asyncHandler(
    async (req: Request, res: Response) => {

        await organisationService.deleteOrganisation(
            req.params.id as string
        );

        return sendResponse(
            res,
            200,
            'Organisation deleted successfully'
        );

    }
);