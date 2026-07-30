import { Router } from 'express';

import controller from '../controllers/company-skill-category.controller';
import { allowRoles } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  createCompanySkillCategorySchema,
  updateCompanySkillCategorySchema,
} from '../validators/company-skill-category';

const router = Router();

router.get('/', allowRoles('company'), controller.getAll);
router.get('/available/admin', allowRoles('company'), controller.getAvailableAdminCategories);
router.post('/', allowRoles('company'), validate(createCompanySkillCategorySchema), controller.create);
router.put('/:id', allowRoles('company'), validate(updateCompanySkillCategorySchema), controller.update);
router.delete('/:id', allowRoles('company'), controller.delete);

export default router;
