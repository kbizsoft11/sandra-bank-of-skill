import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/api-error';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(error);

  const statusCode = error instanceof ApiError
    ? error.statusCode
    : 500;

  res.status(statusCode).json({
    success: false,
    message: error.message || 'Internal Server Error'
  });
};
