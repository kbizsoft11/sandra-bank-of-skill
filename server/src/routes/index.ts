import { Router } from 'express';

import userRouter from './user.route';
import authRouter from './auth.route';
import skillCategoryRoutes from "./skill-category.route";
import skillRoutes from "./skill.route";
import questionnaireRoutes from "./questionnaire.route";
import dashboardRoutes from "./dashboard.route";
import adminGlobalSearchRoutes from "./admin-global-search.route";
import roleRoutes from "./role.route";
import { authenticate } from '../middlewares/auth.middleware';
import { allowRoles } from '../middlewares/role.middleware';
import waitlistRouter from './waitlist.route';
import companySkillCategoryRoutes from './company-skill-category.route';
import organisationRouter from './organisation.routes';
import systemSettingsRouter from './system-settings.routes';
import companyNotificationRoutes from './company-notification.route';
import documentRouter from './document.route';

const router = Router();

router.get('/', (_, res) => {
  res.json({
    success: true,
    message: 'Bank of Skill',
  });
});

router.use('/users', userRouter);
router.use('/auth', authRouter);
router.use('/waitlist', waitlistRouter);
router.use('/documents', authenticate, documentRouter);
router.use('/dashboard', authenticate, dashboardRoutes);
router.use('/admin/global-search', authenticate, adminGlobalSearchRoutes);
router.use('/skill-categories', authenticate, skillCategoryRoutes);
router.use('/company-skill-categories', authenticate, companySkillCategoryRoutes);
router.use('/organisations', authenticate, organisationRouter);
router.use('/admin/system-settings', authenticate, systemSettingsRouter);
router.use("/skills", authenticate, skillRoutes);
router.use("/questionnaires", authenticate, questionnaireRoutes);
router.use("/roles", roleRoutes);
router.use("/company-notifications", companyNotificationRoutes)
// router.use("/skills", authenticate, allowRoles('admin'), skillRoutes);

export default router;