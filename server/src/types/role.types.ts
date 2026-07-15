import { Document, Types } from 'mongoose';

export interface IRole extends Document {
    _id: Types.ObjectId;
    designationName: string;
    description?: string;
    tenantId: string;
    organisationId: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
