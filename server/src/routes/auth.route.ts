import { Router } from 'express';

import { register, getMe, login } from '../controllers/auth.controller';
import { validate } from '../middlewares/validate.middleware';

import { loginSchema, registerSchema } from '../validators/auth.validator';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.get('/me', authenticate, getMe);
router.post('/login', validate(loginSchema), login);

export default router;