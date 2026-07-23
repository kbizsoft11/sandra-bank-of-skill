import { Router } from 'express';
import * as notificationController from '../controllers/company-notification.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { allowRoles } from '../middlewares/role.middleware';

const router = Router();

// Protect all notification management routes for company role
router.use(authenticate);
router.use(allowRoles('company'));

router.get('/', notificationController.getNotifications);
router.get('/:id', notificationController.getNotificationById);
router.post('/', notificationController.createNotification);
router.put('/:id', notificationController.updateNotification);
router.delete('/:id', notificationController.deleteNotification);
router.post('/:id/schedule', notificationController.scheduleNotification);
router.post('/:id/cancel', notificationController.cancelScheduledNotification);

export default router;