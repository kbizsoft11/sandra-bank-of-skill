import {
    Schema,
    model
} from 'mongoose';

import { IOrganisation } from '../types/organisation.types';

const organisationSchema =
    new Schema<IOrganisation>(
        {

            organisationName: {
                type: String,
                required: true,
                trim: true,
            },

            industry: {
                type: String,
                required: true,
            },

            companySize: {
                type: String,
                required: true,
            },

            country: {
                type: String,
                required: true,
            },

            website: {
                type: String,
            },

            description: {
                type: String,
            },

            ownerUserId: {
                type: String,
                required: true,
            },

            tenantId: {
                type: String,
                required: true,
                unique: true,
            },

            prismClientId: {
                type: String,
                required: false,
                trim: true,
            },

        },
        {
            timestamps: true,
        }
    );

export const Organisation =
    model<IOrganisation>(
        'Organisation',
        organisationSchema
    );
