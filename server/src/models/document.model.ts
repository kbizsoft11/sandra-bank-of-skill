import mongoose, { Schema, Document } from 'mongoose';

interface IDocumentRequirement {
  _id?: string;
  documentType: string;
  description: string;
  isRequired: boolean;
  acceptedFormats: string[];
  maxFileSize: number;
  requiresApproval: boolean;
}

interface IDocument extends Document {
  employeeId: string;
  tenantId: string;
  organisationId?: string;
  
  // Requirement reference
  requirementId: string;
  documentType: string;
  
  // File information
  fileName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  
  // Metadata
  description?: string;
  uploadedAt: Date;
  submittedForReviewAt?: Date;
  
  // Verification workflow
  verificationStatus: 'pending_upload' | 'uploaded' | 'under_review' | 'verified' | 'rejected';
  verifiedBy?: string;
  verificationDate?: Date;
  verificationNotes?: string;
  
  // Status tracking
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentSchema = new Schema<IDocument>(
  {
    // Employee & Company
    employeeId: {
      type: String,
      required: true,
      index: true,
    },
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    organisationId: {
      type: String,
      required: false,
    },
    
    // Requirement reference
    requirementId: {
      type: String,
      required: true,
      index: true,
    },
    documentType: {
      type: String,
      required: true,
      index: true,
    },
    
    // File information
    fileName: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      required: true,
      enum: ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'xlsx', 'xls'],
    },
    fileSize: {
      type: Number,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    
    // Metadata
    description: {
      type: String,
      maxlength: 500,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    submittedForReviewAt: {
      type: Date,
      required: false,
    },
    
    // Verification workflow
    verificationStatus: {
      type: String,
      enum: ['pending_upload', 'uploaded', 'under_review', 'verified', 'rejected'],
      default: 'pending_upload',
      index: true,
    },
    verifiedBy: {
      type: String,
      required: false,
    },
    verificationDate: {
      type: Date,
      required: false,
    },
    verificationNotes: {
      type: String,
      maxlength: 1000,
    },
    
    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
DocumentSchema.index({ employeeId: 1, tenantId: 1 });
DocumentSchema.index({ employeeId: 1, verificationStatus: 1 });
DocumentSchema.index({ tenantId: 1, verificationStatus: 1 });
DocumentSchema.index({ requirementId: 1, employeeId: 1 });
DocumentSchema.index({ tenantId: 1, documentType: 1 });

export const DocumentModel = mongoose.model<IDocument>('Document', DocumentSchema);

export default DocumentModel;

