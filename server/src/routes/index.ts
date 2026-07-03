import { Router } from 'express';

import userRouter from './user.route';
import authRouter from './auth.route';
import skillCategoryRoutes from "./skill-category.route";
import skillRoutes from "./skill.route";
import { authenticate } from '../middlewares/auth.middleware';
import { allowRoles } from '../middlewares/role.middleware';

const router = Router();

router.get('/', (_, res) => {
  res.json({
    success: true,
    message: 'Bank of Skill',
  });
});

router.use('/users', userRouter);
router.use('/auth', authRouter);
router.use('/skill-categories', authenticate, skillCategoryRoutes);
router.use("/skills", authenticate, skillRoutes);
// router.use("/skills", authenticate, allowRoles('admin'), skillRoutes);

export default router;