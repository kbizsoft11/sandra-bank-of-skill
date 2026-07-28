import DocumentRequirement from '../models/document-requirement.model';
import Document from '../models/document.model';
import { UserModel } from '../models/user.model';

interface ICreateRequirement {
  documentType: string;
  description?: string;
  isRequired?: boolean;
  acceptedFormats?: string[];
  maxFileSize?: number;
  requiresApproval?: boolean;
  displayOrder?: number;
}

interface IUpdateRequirement {
  documentType?: string;
  description?: string;
  isRequired?: boolean;
  acceptedFormats?: string[];
  maxFileSize?: number;
  requiresApproval?: boolean;
  displayOrder?: number;
}

export const documentRequirementService = {
  /**
   * Create a new document requirement
   */
  createRequirement: async (
    data: ICreateRequirement,
    tenantId: string,
    organisationId: string
  ) => {
    try {
      const requirement = new DocumentRequirement({
        ...data,
        tenantId,
        organisationId,
      });

      await requirement.save();
      return requirement;
    } catch (error: any) {
      throw new Error(`Failed to create document requirement: ${error.message}`);
    }
  },

  /**
   * Get all requirements for a company
   */
  getRequirements: async (tenantId: string) => {
    try {
      const requirements = await DocumentRequirement.find({
        tenantId,
        isActive: true,
      }).sort({ displayOrder: 1, createdAt: 1 });

      return requirements;
    } catch (error: any) {
      throw new Error(`Failed to retrieve document requirements: ${error.message}`);
    }
  },

  /**
   * Update a document requirement
   */
  updateRequirement: async (
    id: string,
    updateData: IUpdateRequirement,
    tenantId: string
  ) => {
    try {
      const requirement = await DocumentRequirement.findOneAndUpdate(
        { _id: id, tenantId, isActive: true },
        { ...updateData, updatedAt: new Date() },
        { new: true }
      );

      if (!requirement) {
        throw new Error('Document requirement not found');
      }

      return requirement;
    } catch (error: any) {
      throw new Error(`Failed to update document requirement: ${error.message}`);
    }
  },

  /**
   * Delete (soft delete) a document requirement
   */
  deleteRequirement: async (id: string, tenantId: string) => {
    try {
      const requirement = await DocumentRequirement.findOneAndUpdate(
        { _id: id, tenantId },
        { isActive: false, deletedAt: new Date() },
        { new: true }
      );

      if (!requirement) {
        throw new Error('Document requirement not found');
      }

      return requirement;
    } catch (error: any) {
      throw new Error(`Failed to delete document requirement: ${error.message}`);
    }
  },

  /**
   * Get employee's document upload status for all requirements
   */
  getEmployeeDocumentStatus: async (employeeId: string, tenantId: string) => {
    try {
      // Get all active requirements
      const requirements = await DocumentRequirement.find({
        tenantId,
        isActive: true,
      }).sort({ displayOrder: 1 });

      // Get all documents uploaded by employee
      const documents = await Document.find({
        employeeId,
        tenantId,
        isActive: true,
      });

      // Map requirements with their upload status
      const status = requirements.map((requirement) => {
        const document = documents.find(
          (doc) => doc.requirementId?.toString() === requirement._id.toString()
        );

        return {
          requirement: {
            _id: requirement._id,
            documentType: requirement.documentType,
            description: requirement.description,
            isRequired: requirement.isRequired,
            acceptedFormats: requirement.acceptedFormats,
            maxFileSize: requirement.maxFileSize,
            requiresApproval: requirement.requiresApproval,
            displayOrder: requirement.displayOrder,
          },
          document: document
            ? {
                _id: document._id,
                fileName: document.fileName,
                fileType: document.fileType,
                uploadedAt: document.uploadedAt,
                verificationStatus: document.verificationStatus,
                verificationNotes: document.verificationNotes,
              }
            : null,
          uploadStatus: document?.verificationStatus || 'pending_upload',
        };
      });

      return status;
    } catch (error: any) {
      throw new Error(`Failed to get employee document status: ${error.message}`);
    }
  },

  /**
   * Get company-wide compliance report
   */
  getComplianceReport: async (tenantId: string, organisationId: string) => {
    try {
      // Get all requirements
      const requirements = await DocumentRequirement.find({
        tenantId,
        organisationId,
        isActive: true,
      });

      // Get all employees in company
      const employees = await UserModel.find({
        tenantId,
        organisationId,
        role: 'employee',
        isActive: true,
      });

      // Get all documents
      const documents = await Document.find({
        tenantId,
        organisationId,
        isActive: true,
      });

      // Calculate compliance metrics
      const totalRequirements = requirements.length;
      const totalEmployees = employees.length;

      let fullyCompliant = 0;
      let partiallyCompliant = 0;
      let nonCompliant = 0;

      const employeeCompliance = employees.map((employee: any) => {
        const requiredDocuments = requirements.filter((r) => r.isRequired);
        const employeeDocuments = documents.filter(
          (d) => d.employeeId?.toString() === employee._id.toString()
        );

        const verifiedDocs = employeeDocuments.filter(
          (d) => d.verificationStatus === 'verified'
        );

        const requiredVerified = verifiedDocs.filter((d) => {
          const req = requiredDocuments.find(
            (r) => r._id.toString() === d.requirementId?.toString()
          );
          return req !== undefined;
        });

        const compliancePercentage =
          requiredDocuments.length > 0
            ? Math.round((requiredVerified.length / requiredDocuments.length) * 100)
            : 100;

        if (compliancePercentage === 100) {
          fullyCompliant++;
        } else if (compliancePercentage > 0) {
          partiallyCompliant++;
        } else {
          nonCompliant++;
        }

        return {
          employeeId: employee._id,
          employeeName: employee.name,
          compliancePercentage,
          uploadedDocuments: employeeDocuments.length,
          verifiedDocuments: verifiedDocs.length,
          requiredDocuments: requiredDocuments.length,
          documents: employeeDocuments.map((d) => ({
            _id: d._id,
            requirementId: d.requirementId,
            verificationStatus: d.verificationStatus,
            uploadedAt: d.uploadedAt,
          })),
        };
      });

      return {
        totalRequirements,
        totalEmployees,
        complianceBreakdown: {
          fullyCompliant,
          partiallyCompliant,
          nonCompliant,
        },
        compliancePercentage: Math.round(
          (fullyCompliant / totalEmployees) * 100
        ),
        employeeCompliance,
      };
    } catch (error: any) {
      throw new Error(`Failed to generate compliance report: ${error.message}`);
    }
  },

  /**
   * Validate document against requirement specs
   */
  validateDocumentAgainstRequirement: async (
    requirementId: string,
    fileExtension: string,
    fileSize: number,
    tenantId: string
  ) => {
    try {
      const requirement = await DocumentRequirement.findOne({
        _id: requirementId,
        tenantId,
        isActive: true,
      });

      if (!requirement) {
        throw new Error('Document requirement not found');
      }

      // Check file format
      if (!requirement.acceptedFormats.includes(fileExtension)) {
        throw new Error(
          `File format not accepted. Accepted formats: ${requirement.acceptedFormats.join(', ')}`
        );
      }

      // Check file size
      if (fileSize > requirement.maxFileSize) {
        throw new Error(
          `File size exceeds limit of ${requirement.maxFileSize / (1024 * 1024)}MB`
        );
      }

      return requirement;
    } catch (error: any) {
      throw new Error(`Validation failed: ${error.message}`);
    }
  },
};
