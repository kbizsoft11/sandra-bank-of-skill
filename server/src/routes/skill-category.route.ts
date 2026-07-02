import {
    Router
} from 'express';

import controller from '../controllers/skill-category.controller';
import { validate } from '../middlewares/validate.middleware';
import { createSkillCategorySchema, updateSkillCategorySchema } from '../validators/skill-category';

const router = Router();

router.post('/', validate(createSkillCategorySchema), controller.create);

router.get('/', controller.getAll);

router.get('/:id', controller.getById);

router.put('/:id', validate(updateSkillCategorySchema), controller.update);

router.delete('/:id', controller.delete);

export default router;