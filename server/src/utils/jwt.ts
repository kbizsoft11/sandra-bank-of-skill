import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { JwtUserPayload } from '../types/jwt-payload.types';

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

export const verifyToken = (token: string): JwtUserPayload => {
  return jwt.verify(
    token,
    env.JWT_SECRET!
  ) as JwtUserPayload;
};
