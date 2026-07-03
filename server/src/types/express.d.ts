import { JwtPayload } from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      user?: JwtUserPayload;
      // user?: string | JwtPayload;
    }
  }
}

export {};