import mongoose, { Schema, Document } from 'mongoose';

interface IDocumentRequirement extends Document {
  tenantId: string;
  organisationId?: string;
  documentType: string;
  description: string;
  isRequired: boolean;
  acceptedFormats: string[];
  maxFileSize: number; // in MB
  requiresApproval: boolean;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentRequirementSchema = new Schema<IDocumentRequirement>(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    organisationId: {
      type: String,
      required: false,
    },
    documentType: {
      type: String,
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      maxlength: 500,
    },
    isRequired: {
      type: Boolean,
      default: true,
      index: true,
    },
    acceptedFormats: {
      type: [String],
      default: ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'],
    },
    maxFileSize: {
      type: Number,
      default: 10, // 10 MB
    },
    requiresApproval: {
      type: Boolean,
      default: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
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

// Indexes
DocumentRequirementSchema.index({ tenantId: 1, isActive: 1 });
DocumentRequirementSchema.index({ tenantId: 1, documentType: 1 });

const DocumentRequirement = mongoose.model<IDocumentRequirement>(
  'DocumentRequirement',
  DocumentRequirementSchema
);

export default DocumentRequirement;
