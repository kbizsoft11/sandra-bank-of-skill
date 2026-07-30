import {
    Router
} from 'express';

import controller from '../controllers/skill-category.controller';
import { validate } from '../middlewares/validate.middleware';
import { createSkillCategorySchema, updateSkillCategorySchema } from '../validators/skill-category';
import { allowRoles } from '../middlewares/role.middleware';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Skill category routes - admin can do everything, company can create/update/delete their own
router.post('/', authenticate, allowRoles('admin', 'company'), validate(createSkillCategorySchema), controller.create);

router.get('/', controller.getAll);

router.get('/:id', controller.getById);

router.put('/:id', authenticate, allowRoles('admin', 'company'), validate(updateSkillCategorySchema), controller.update);

router.patch('/:id/status', authenticate, allowRoles('admin', 'company'), controller.updateStatus);

router.delete('/:id', authenticate, allowRoles('admin', 'company'), controller.delete);

export default router;