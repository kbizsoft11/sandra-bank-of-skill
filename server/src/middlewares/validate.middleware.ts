// middlewares/validate.middleware.ts

import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export const validate =
  (schema: ZodSchema) =>
    (req: Request, res: Response, next: NextFunction) => {

      const result = schema.safeParse(req.body);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          errors: result.error.issues,
        });
      }

      next();
    };


export const validateParams =
  (schema: ZodSchema) =>
    (
      req: Request,
      res: Response,
      next: NextFunction
    ) => {

      const result =
        schema.safeParse(req.params);

      if (!result.success) {

        return res.status(400).json({

          success: false,

          errors: result.error.issues

        });

      }

      next();

    };