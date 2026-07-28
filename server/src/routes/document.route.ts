import { Router } from 'express';
import { documentController } from '../controllers/document.controller';
import { documentRequirementController } from '../controllers/document-requirement.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { documentUpload } from '../utils/file-upload';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * Employee routes
 */

// Upload document
router.post(
  '/upload',
  documentUpload.single('file'),
  documentController.uploadDocument
);

// Get my documents
router.get('/me', documentController.getMyDocuments);

// Get document summary
router.get('/summary', documentController.getDocumentSummary);

// Submit a single document for review
router.post('/:id/submit-for-review', documentController.submitDocumentForReview);

// Submit all documents for review
router.post('/submit-for-review', documentController.submitAllForReview);

// Delete document
router.delete('/:id', documentController.deleteDocument);

// Download document
router.get('/:id/download', documentController.getDocument);

/**
 * Company admin routes
 */

// Get documents for verification (company only)
router.get('/verify/list', documentController.getDocumentsForVerification);

// Verify document (company only)
router.put('/:id/verify', documentController.verifyDocument);

/**
 * Document Requirements routes (Company admin only)
 */

// Create requirement
router.post(
  '/requirements/create',
  documentRequirementController.createRequirement
);

// Get all requirements
router.get(
  '/requirements',
  documentRequirementController.getRequirements
);

// Get employee document status
router.get(
  '/requirements/employee-status/:employeeId',
  documentRequirementController.getEmployeeDocumentStatus
);

// Get compliance report
router.get(
  '/requirements/compliance-report',
  documentRequirementController.getComplianceReport
);

// Update requirement
router.put(
  '/requirements/:id',
  documentRequirementController.updateRequirement
);

// Delete requirement
router.delete(
  '/requirements/:id',
  documentRequirementController.deleteRequirement
);

export default router;
