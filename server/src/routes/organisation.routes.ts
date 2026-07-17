import { Router } from 'express';

import { authenticate } from '../middlewares/auth.middleware';
import { getMyOrganisation, getOrganisationById, updateMyOrganisation } from '../controllers/organisation.controller';

const router = Router();

router.get('/me', authenticate, getMyOrganisation);
router.put('/me', authenticate, updateMyOrganisation);
router.get('/:id', authenticate, getOrganisationById);

export default router;
