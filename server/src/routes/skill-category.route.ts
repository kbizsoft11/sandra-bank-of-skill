import {
    Router
} from 'express';

import controller from '../controllers/skill-category.controller';
import { validate } from '../middlewares/validate.middleware';
import { createSkillCategorySchema, updateSkillCategorySchema } from '../validators/skill-category';
import { allowRoles } from '../middlewares/role.middleware';

const router = Router();

// All skill category routes are admin-only
router.post('/', allowRoles('admin'), validate(createSkillCategorySchema), controller.create);

router.get('/', controller.getAll);

router.get('/:id', controller.getById);

router.put('/:id', allowRoles('admin'), validate(updateSkillCategorySchema), controller.update);

router.delete('/:id', allowRoles('admin'), controller.delete);

export default router;