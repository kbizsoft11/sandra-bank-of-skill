import { Router } from 'express';
import * as supportTicketController from '../controllers/support-ticket.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { allowRoles } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createSupportTicketSchema, updateSupportTicketStatusSchema } from '../validators/support-ticket.validator';

const router = Router();

router.use(authenticate);
router.use(allowRoles('admin', 'company', 'employee'));

router.get('/', supportTicketController.getSupportTickets);
router.get('/:id', supportTicketController.getSupportTicketById);
router.post('/', validate(createSupportTicketSchema), supportTicketController.createSupportTicket);
router.patch('/:id/status', validate(updateSupportTicketStatusSchema), supportTicketController.updateSupportTicketStatus);

export default router;