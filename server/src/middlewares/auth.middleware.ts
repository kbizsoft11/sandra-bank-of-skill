import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

import { env } from '../config/env';
import { JwtUserPayload } from '../types/jwt-payload.types';

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {

  const authHeader = req.headers.authorization;

  if (
    !authHeader ||
    !authHeader.startsWith('Bearer ')
  ) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized',
    });
  }

  const token = authHeader.split(' ')[1];

  try {

    const decoded = jwt.verify(
      token,
      env.JWT_SECRET
    ) as JwtUserPayload;

    req.user = decoded;

    next();

  } catch {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
    });
  }
};