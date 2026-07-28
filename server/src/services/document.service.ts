import Document from '../models/document.model';
import DocumentRequirement from '../models/document-requirement.model';
import { userRepository } from '../repositories/user.repository';
import { deleteOldProfileImage, getPublicUploadUrl } from '../utils/file-upload';
import { documentRequirementService } from './document-requirement.service';
import path from 'path';
import * as AdminDashboardService from './admin-dashboard.service';

export const documentService = {
  uploadDocument: async (
    employeeId: string,
    file: Express.Multer.File,
    requirementId: string,
    tenantId: string,
    organisationId?: string,
    description?: string
  ) => {
    if (!file) {
      throw new Error('No file provided');
    }

    // Validate requirement exists
    const requirement = await DocumentRequirement.findById(requirementId);
    if (!requirement) {
      throw new Error('Document requirement not found');
    }

    // Validate requirement belongs to this tenant
    if (requirement.tenantId !== tenantId) {
      throw new Error('Invalid document requirement for this company');
    }

    // Extract file extension
    const fileExtension = path.extname(file.originalname).substring(1).toLowerCase();

    // Validate against requirement
    await documentRequirementService.validateDocumentAgainstRequirement(
      requirementId,
      fileExtension,
      file.size,
      tenantId
    );

    // Check if employee already has an uploaded document for this requirement
    const existingDoc = await Document.findOne({
      employeeId,
      requirementId,
      isActive: true,
    });

    // If exists and verified, don't allow re-upload
    if (existingDoc && existingDoc.verificationStatus === 'verified') {
      throw new Error('Document already verified. Cannot re-upload verified documents.');
    }

    // If exists and not verified, mark old one as inactive
    if (existingDoc) {
      await Document.findByIdAndUpdate(existingDoc._id, { isActive: false });
    }

    // Get employee for activity logging
    const employee = await userRepository.findById(employeeId);
    if (!employee) {
      throw new Error('Employee not found');
    }

    // Create document record
    const document = await Document.create({
      employeeId,
      tenantId,
      organisationId,
      requirementId,
      documentType: requirement.documentType,
      fileName: file.originalname,
      fileType: fileExtension,
      fileSize: file.size,
      filePath: getPublicUploadUrl(`documents/${file.filename}`),
      description: description || '',
      uploadedAt: new Date(),
      verificationStatus: 'pending_upload',
      isActive: true,
    });

    // Log activity
    await AdminDashboardService.createActivity(
      employeeId,
      employee.fullName,
      `Uploaded document: ${requirement.documentType}`,
      'document_upload',
      {
        documentType: requirement.documentType,
        fileName: file.originalname,
        fileSize: file.size,
      }
    );

    return document;
  },

  /**
   * Get documents for an employee
   */
  getEmployeeDocuments: async (employeeId: string, tenantId: string) => {
    const documents = await Document.find({
      employeeId,
      tenantId,
      isActive: true,
    })
      .sort({ uploadedAt: -1 })
      .lean();

    return documents;
  },

  /**
   * Get documents pending verification (company view)
   */
  getDocumentsForVerification: async (
    tenantId: string,
    filters?: {
      verificationStatus?: string;
      documentType?: string;
      employeeId?: string;
      page?: number;
      limit?: number;
    }
  ) => {
    const filter: any = {
      tenantId,
      isActive: true,
    };

    if (filters?.verificationStatus) {
      filter.verificationStatus = filters.verificationStatus;
    } else {
      filter.verificationStatus = 'under_review';
    }

    if (filters?.documentType) {
      filter.documentType = filters.documentType;
    }

    if (filters?.employeeId) {
      filter.employeeId = filters.employeeId;
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const total = await Document.countDocuments(filter);
    const documents = await Document.find(filter)
      .sort({ uploadedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const documentsWithEmployeeDetails = await Promise.all(
      documents.map(async (document) => {
        const employee = await userRepository.findById(document.employeeId);
        return {
          ...document,
          employeeName: employee?.fullName || 'Unknown employee',
        };
      })
    );

    return {
      documents: documentsWithEmployeeDetails,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * Verify or reject a document
   */
  verifyDocument: async (
    documentId: string,
    verificationStatus: 'verified' | 'rejected' | 'under_review',
    verifiedBy: string,
    verificationNotes?: string,
    tenantId?: string
  ) => {
    const document = await Document.findById(documentId);

    if (!document) {
      throw new Error('Document not found');
    }

    // Verify authorization
    if (tenantId && document.tenantId !== tenantId) {
      throw new Error('Unauthorized to verify this document');
    }

    // Get employee for activity log
    const employee = await userRepository.findById(document.employeeId);

    // Update document
    const updatedDocument = await Document.findByIdAndUpdate(
      documentId,
      {
        verificationStatus,
        verifiedBy,
        verificationDate: new Date(),
        verificationNotes: verificationNotes || '',
      },
      { new: true }
    );

    // Log activity
    await AdminDashboardService.createActivity(
      document.employeeId,
      employee?.fullName || 'Employee',
      `Document ${document.documentType} has been ${verificationStatus}`,
      'document_verification',
      {
        documentType: document.documentType,
        fileName: document.fileName,
        verificationStatus,
        verificationNotes: verificationNotes || '',
      }
    );

    return updatedDocument;
  },

  /**
   * Delete a document
   */
  deleteDocument: async (
    documentId: string,
    employeeId: string,
    tenantId: string
  ) => {
    const document = await Document.findById(documentId);

    if (!document) {
      throw new Error('Document not found');
    }

    // Verify authorization
    if (document.employeeId !== employeeId || document.tenantId !== tenantId) {
      throw new Error('Unauthorized to delete this document');
    }

    // Don't allow deletion of verified documents
    if (document.verificationStatus === 'verified') {
      throw new Error('Cannot delete verified documents');
    }

    // Delete file from storage
    if (document.filePath) {
      const filePath = path.join(__dirname, '../../uploads/documents', path.basename(document.filePath));
      deleteOldProfileImage(filePath);
    }

    // Soft delete
    await Document.findByIdAndUpdate(documentId, { isActive: false });

    // Log activity
    const employee = await userRepository.findById(document.employeeId);
    await AdminDashboardService.createActivity(
      document.employeeId,
      employee?.fullName || 'Employee',
      `Deleted ${document.documentType} document`,
      'document_deletion',
      {
        documentType: document.documentType,
        fileName: document.fileName,
      }
    );

    return { success: true };
  },

  /**
   * Get a single document
   */
  getDocument: async (
    documentId: string,
    userId: string,
    userRole?: string,
    tenantId?: string
  ) => {
    const document = await Document.findById(documentId);

    if (!document) {
      throw new Error('Document not found');
    }

    // Access control
    if (userRole === 'employee' && document.employeeId !== userId) {
      throw new Error('Unauthorized to access this document');
    }

    if (userRole === 'company' && document.tenantId !== tenantId) {
      throw new Error('Unauthorized to access this document');
    }

    return document;
  },

  /**
   * Submit all documents for review
   */
  submitAllForReview: async (employeeId: string, tenantId: string) => {
    // Get all employee's uploaded documents that are not yet under review or verified
    const documents = await Document.find({
      employeeId,
      tenantId,
      isActive: true,
      verificationStatus: { $in: ['pending_upload', 'uploaded'] },
    });

    if (documents.length === 0) {
      throw new Error('No documents available to submit for review');
    }

    // Update all eligible documents to 'under_review' status
    const updatePromises = documents.map((doc) =>
      Document.findByIdAndUpdate(
        doc._id,
        {
          verificationStatus: 'under_review',
          submittedForReviewAt: new Date(),
        },
        { new: true }
      )
    );

    const updatedDocuments = await Promise.all(updatePromises);

    // Log activity
    const employee = await userRepository.findById(employeeId);
    await AdminDashboardService.createActivity(
      employeeId,
      employee?.fullName || 'Employee',
      `Submitted ${updatedDocuments.length} document(s) for review`,
      'document_submission',
      {
        documentsCount: updatedDocuments.length,
        documentTypes: updatedDocuments.map((d) => d?.documentType),
      }
    );

    return {
      updatedCount: updatedDocuments.length,
      documents: updatedDocuments,
    };
  },
};
