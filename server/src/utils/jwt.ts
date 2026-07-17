import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { JwtUserPayload } from '../types/jwt-payload.types';

export const generateToken = (
  payload: Record<string, unknown>,
  options?: SignOptions
): string => {
  return jwt.sign(
    payload,
    env.JWT_SECRET!,
    {
      expiresIn: env.JWT_EXPIRES_IN,
      ...options,
    }
  );
};

export const generateInvitationToken = (
  payload: Record<string, unknown>
): string => {
  return generateToken(payload, {
    expiresIn: '7d',
  });
};

export const verifyToken = (token: string): JwtUserPayload => {
  return jwt.verify(
    token,
    env.JWT_SECRET!
  ) as JwtUserPayload;
};
