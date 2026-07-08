import { Router } from 'express';
import { addToWaitlist } from '../controllers/waitlist.controller';
import { validate } from '../middlewares/validate.middleware';
import { createWaitlistSchema } from '../validators/waitlist.validator';

const router = Router();

router.post('/', validate(createWaitlistSchema), addToWaitlist);

export default router;
