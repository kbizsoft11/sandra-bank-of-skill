/**
 * Assessments Routes
 */

import { Router } from 'express';
import {
  createAssessment,
  getAssessmentStatus,
  getAssessmentReport,
  getAssessmentMap,
  unlockAssessmentReport,
  getOrganisationAssessments,
  getMyAssessments,
} from '../controllers/assessments.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { allowRoles } from '../middlewares/role.middleware';

const router = Router();

router.use(authenticate);

router.get('/my-assessments', allowRoles('employee'), getMyAssessments);
router.post('/', allowRoles('admin', 'company'), createAssessment);
router.get('/:employeeId/status', getAssessmentStatus);
router.get('/:employeeId/report', getAssessmentReport);
router.get('/:employeeId/map', getAssessmentMap);
router.post('/:employeeId/unlock', allowRoles('admin', 'company'), unlockAssessmentReport);
router.get('/organisation/:organisationId/employees', getOrganisationAssessments);

export default router;
