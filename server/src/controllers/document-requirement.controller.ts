import { Request, Response } from 'express';
import { documentRequirementService } from '../services/document-requirement.service';

export const documentRequirementController = {
  /**
   * Create document requirement
   * POST /api/document-requirements
   */
  createRequirement: async (req: Request, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      const organisationId = req.user?.organisationId;

      if (!tenantId || !organisationId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated. Please login again.',
        });
      }

      if (req.user?.role !== 'company') {
        return res.status(403).json({
          success: false,
          message: 'Only company admins can create document requirements',
        });
      }

      const {
        documentType,
        description,
        isRequired,
        acceptedFormats,
        maxFileSize,
        requiresApproval,
        displayOrder,
      } = req.body;

      if (!documentType) {
        return res.status(400).json({
          success: false,
          message: 'Document type is required',
        });
      }

      const requirement = await documentRequirementService.createRequirement(
        {
          documentType,
          description,
          isRequired: isRequired ?? true,
          acceptedFormats: acceptedFormats || ['pdf', 'doc', 'docx', 'jpg', 'png'],
          maxFileSize: maxFileSize || 10 * 1024 * 1024,
          requiresApproval: requiresApproval ?? true,
          displayOrder: displayOrder || 0,
        },
        tenantId,
        organisationId
      );

      return res.status(201).json({
        success: true,
        message: 'Document requirement created successfully',
        data: requirement,
      });
    } catch (error: any) {
      console.error('Error creating document requirement:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Error creating document requirement',
      });
    }
  },

  /**
   * Get all document requirements for company
   * GET /api/document-requirements
   */
  getRequirements: async (req: Request, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated. Please login again.',
        });
      }

      const requirements = await documentRequirementService.getRequirements(tenantId);

      return res.status(200).json({
        success: true,
        message: 'Document requirements retrieved successfully',
        data: requirements,
      });
    } catch (error: any) {
      console.error('Error retrieving document requirements:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Error retrieving document requirements',
      });
    }
  },

  /**
   * Update document requirement
   * PUT /api/document-requirements/:id
   */
  updateRequirement: async (req: Request, res: Response) => {
    try {
      let { id } = req.params;
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated. Please login again.',
        });
      }

      if (req.user?.role !== 'company') {
        return res.status(403).json({
          success: false,
          message: 'Only company admins can update document requirements',
        });
      }

      id = Array.isArray(id) ? id[0] : String(id);

      const updateData = req.body;

      const requirement = await documentRequirementService.updateRequirement(
        id,
        updateData,
        tenantId
      );

      return res.status(200).json({
        success: true,
        message: 'Document requirement updated successfully',
        data: requirement,
      });
    } catch (error: any) {
      console.error('Error updating document requirement:', error);
      if (error.message === 'Document requirement not found') {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }
      return res.status(500).json({
        success: false,
        message: error.message || 'Error updating document requirement',
      });
    }
  },

  /**
   * Delete document requirement
   * DELETE /api/document-requirements/:id
   */
  deleteRequirement: async (req: Request, res: Response) => {
    try {
      let { id } = req.params;
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated. Please login again.',
        });
      }

      if (req.user?.role !== 'company') {
        return res.status(403).json({
          success: false,
          message: 'Only company admins can delete document requirements',
        });
      }

      id = Array.isArray(id) ? id[0] : String(id);

      await documentRequirementService.deleteRequirement(id, tenantId);

      return res.status(200).json({
        success: true,
        message: 'Document requirement deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting document requirement:', error);
      if (error.message === 'Document requirement not found') {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }
      return res.status(500).json({
        success: false,
        message: error.message || 'Error deleting document requirement',
      });
    }
  },

  /**
   * Get employee document status against requirements
   * GET /api/document-requirements/employee-status/:employeeId
   */
  getEmployeeDocumentStatus: async (req: Request, res: Response) => {
    try {
      let { employeeId } = req.params;
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated. Please login again.',
        });
      }

      employeeId = Array.isArray(employeeId) ? employeeId[0] : String(employeeId);

      const status = await documentRequirementService.getEmployeeDocumentStatus(
        employeeId,
        tenantId
      );

      return res.status(200).json({
        success: true,
        message: 'Employee document status retrieved successfully',
        data: status,
      });
    } catch (error: any) {
      console.error('Error retrieving employee document status:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Error retrieving employee document status',
      });
    }
  },

  /**
   * Get company compliance report
   * GET /api/document-requirements/compliance-report
   */
  getComplianceReport: async (req: Request, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      const organisationId = req.user?.organisationId;

      if (!tenantId || !organisationId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated. Please login again.',
        });
      }

      if (req.user?.role !== 'company') {
        return res.status(403).json({
          success: false,
          message: 'Only company admins can view compliance reports',
        });
      }

      const report = await documentRequirementService.getComplianceReport(
        tenantId,
        organisationId
      );

      return res.status(200).json({
        success: true,
        message: 'Compliance report retrieved successfully',
        data: report,
      });
    } catch (error: any) {
      console.error('Error retrieving compliance report:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Error retrieving compliance report',
      });
    }
  },
};
