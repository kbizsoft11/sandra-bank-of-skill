import { Request, Response } from 'express';
import { documentService } from '../services/document.service';

export const documentController = {
  uploadDocument: async (req: Request, res: Response) => {
    try {
      let { requirementId, description } = req.body;
      
      const userId = req.user?.userId;
      const tenantId = req.user?.tenantId;
      const organisationId = req.user?.organisationId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated. Please login again.',
        });
      }

      if (!tenantId) {
        return res.status(401).json({
          success: false,
          message: 'Tenant information not found. Please login again.',
        });
      }

      if (!requirementId) {
        return res.status(400).json({
          success: false,
          message: 'Document requirement ID is required',
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file provided',
        });
      }

      const MAX_FILE_SIZE = 10 * 1024 * 1024;
      if (req.file.size > MAX_FILE_SIZE) {
        return res.status(400).json({
          success: false,
          message: 'File size exceeds 10MB limit',
        });
      }

      const document = await documentService.uploadDocument(
        userId,
        req.file,
        requirementId,
        tenantId,
        organisationId,
        description
      );

      return res.status(201).json({
        success: true,
        message: 'Document uploaded successfully',
        data: document,
      });
    } catch (error: any) {
      console.error('Error uploading document:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Error uploading document',
      });
    }
  },

  /**
   * Get my documents
   * GET /api/documents/me
   */
  getMyDocuments: async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId;
      const tenantId = req.user?.tenantId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated. Please login again.',
        });
      }

      if (!tenantId) {
        return res.status(401).json({
          success: false,
          message: 'Tenant information not found. Please login again.',
        });
      }

      const documents = await documentService.getEmployeeDocuments(userId, tenantId);

      return res.status(200).json({
        success: true,
        message: 'Documents retrieved successfully',
        data: documents,
      });
    } catch (error: any) {
      console.error('Error retrieving documents:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Error retrieving documents',
      });
    }
  },

  /**
   * Delete a document
   * DELETE /api/documents/:id
   */
  deleteDocument: async (req: Request, res: Response) => {
    try {
      let { id } = req.params;
      const userId = req.user?.userId;
      const tenantId = req.user?.tenantId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated. Please login again.',
        });
      }

      if (!tenantId) {
        return res.status(401).json({
          success: false,
          message: 'Tenant information not found. Please login again.',
        });
      }

      id = Array.isArray(id) ? id[0] : String(id);

      await documentService.deleteDocument(id, userId, tenantId);

      return res.status(200).json({
        success: true,
        message: 'Document deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting document:', error);
      if (error.message.includes('Unauthorized') || error.message.includes('verified')) {
        return res.status(403).json({
          success: false,
          message: error.message,
        });
      }
      return res.status(500).json({
        success: false,
        message: error.message || 'Error deleting document',
      });
    }
  },

  /**
   * Get document summary
   * GET /api/documents/summary
   */
  getDocumentSummary: async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId;
      const tenantId = req.user?.tenantId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated. Please login again.',
        });
      }

      if (!tenantId) {
        return res.status(401).json({
          success: false,
          message: 'Tenant information not found. Please login again.',
        });
      }

      const documents = await documentService.getEmployeeDocuments(userId, tenantId);

      const summary = {
        total: documents.length,
        verified: documents.filter((d) => d.verificationStatus === 'verified').length,
        pending: documents.filter((d) => d.verificationStatus === 'pending_upload' || d.verificationStatus === 'uploaded').length,
        rejected: documents.filter((d) => d.verificationStatus === 'rejected').length,
        underReview: documents.filter((d) => d.verificationStatus === 'under_review').length,
      };

      return res.status(200).json({
        success: true,
        message: 'Document summary retrieved successfully',
        data: summary,
      });
    } catch (error: any) {
      console.error('Error retrieving document summary:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Error retrieving document summary',
      });
    }
  },

  /**
   * Get documents for verification
   * GET /api/documents/verify/list
   */
  getDocumentsForVerification: async (req: Request, res: Response) => {
    try {
      if (req.user?.role !== 'company') {
        return res.status(403).json({
          success: false,
          message: 'Only company admins can verify documents',
        });
      }

      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({
          success: false,
          message: 'Tenant information not found. Please login again.',
        });
      }

      const {
        verificationStatus,
        documentType,
        employeeId,
        page = 1,
        limit = 20,
      } = req.query;

      const documents = await documentService.getDocumentsForVerification(
        tenantId,
        {
          verificationStatus: verificationStatus as string,
          documentType: documentType as string,
          employeeId: employeeId as string,
          page: Number(page),
          limit: Number(limit),
        }
      );

      return res.status(200).json({
        success: true,
        message: 'Documents for verification retrieved successfully',
        data: documents,
      });
    } catch (error: any) {
      console.error('Error retrieving documents for verification:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Error retrieving documents for verification',
      });
    }
  },

  /**
   * Verify a document (company only)
   * PUT /api/documents/:id/verify
   */
  verifyDocument: async (req: Request, res: Response) => {
    try {
      if (req.user?.role !== 'company') {
        return res.status(403).json({
          success: false,
          message: 'Only company admins can verify documents',
        });
      }

      let { id } = req.params;
      let { verificationStatus, verificationNotes } = req.body;

      id = Array.isArray(id) ? id[0] : String(id);

      if (!['verified', 'rejected', 'under_review'].includes(verificationStatus)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid verification status. Must be "verified", "rejected", or "under_review"',
        });
      }

      const verifiedBy = req.user?.userId;
      if (!verifiedBy) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated. Please login again.',
        });
      }

      verificationStatus = Array.isArray(verificationStatus) ? verificationStatus[0] : String(verificationStatus);
      verificationNotes = Array.isArray(verificationNotes) ? verificationNotes[0] : (verificationNotes ? String(verificationNotes) : undefined);

      const document = await documentService.verifyDocument(
        id,
        verificationStatus as 'verified' | 'rejected' | 'under_review',
        verifiedBy,
        verificationNotes,
        req.user?.tenantId
      );

      return res.status(200).json({
        success: true,
        message: `Document ${verificationStatus} successfully`,
        data: document,
      });
    } catch (error: any) {
      console.error('Error verifying document:', error);
      if (error.message === 'Unauthorized to verify this document') {
        return res.status(403).json({
          success: false,
          message: error.message,
        });
      }
      return res.status(500).json({
        success: false,
        message: error.message || 'Error verifying document',
      });
    }
  },

  /**
   * Download document
   * GET /api/documents/:id/download
   */
  getDocument: async (req: Request, res: Response) => {
    try {
      let { id } = req.params;
      const userId = req.user?.userId;
      const userRole = req.user?.role;
      const tenantId = req.user?.tenantId;

      id = Array.isArray(id) ? id[0] : String(id);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated. Please login again.',
        });
      }

      const document = await documentService.getDocument(
        id,
        userId,
        userRole,
        tenantId
      );

      return res.status(200).json({
        success: true,
        message: 'Document retrieved successfully',
        data: {
          _id: document._id,
          fileName: document.fileName,
          fileType: document.fileType,
          filePath: document.filePath,
          documentType: document.documentType,
          uploadedAt: document.uploadedAt,
          verificationStatus: document.verificationStatus,
        },
      });
    } catch (error: any) {
      console.error('Error retrieving document:', error);
      if (error.message === 'Unauthorized to access this document') {
        return res.status(403).json({
          success: false,
          message: error.message,
        });
      }
      return res.status(500).json({
        success: false,
        message: error.message || 'Error retrieving document',
      });
    }
  },

  /**
   * Submit all documents for review
   * POST /api/documents/submit-for-review
   */
  submitAllForReview: async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId;
      const tenantId = req.user?.tenantId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated. Please login again.',
        });
      }

      if (!tenantId) {
        return res.status(401).json({
          success: false,
          message: 'Tenant information not found. Please login again.',
        });
      }

      const result = await documentService.submitAllForReview(userId, tenantId);

      return res.status(200).json({
        success: true,
        message: 'All documents submitted for review successfully',
        data: result,
      });
    } catch (error: any) {
      console.error('Error submitting documents for review:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Error submitting documents for review',
      });
    }
  },
};
