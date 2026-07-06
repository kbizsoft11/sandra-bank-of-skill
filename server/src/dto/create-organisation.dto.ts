import { CompanySize } from '../types/common.types';

export interface CreateOrganisationDto {

    organisationName: string;

    industry: string;

    companySize: CompanySize;

    country: string;

    website?: string;

    description?: string;

}