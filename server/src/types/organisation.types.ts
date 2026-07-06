import { CompanySize } from './common.types';

export interface IOrganisation {

    organisationName: string;

    industry: string;

    companySize: CompanySize;

    country: string;

    website?: string;

    description?: string;

    ownerUserId: string;

    tenantId: string;
}