import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export const generateToken = (
  payload: Record<string, unknown>
): string => {
  return jwt.sign(
    payload,
    env.JWT_SECRET!,
    {
      expiresIn: env.JWT_EXPIRES_IN,
    }
  );
};