import { Router } from "express";
import { createUser, getAllUsers } from "../controllers/user.controller";
import { createUserSchema } from "../validators/user.validator";
import { validate } from "../middlewares/validate.middleware";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.get('/', authenticate ,getAllUsers);
router.post('/', authenticate, validate(createUserSchema),createUser);

export default router;