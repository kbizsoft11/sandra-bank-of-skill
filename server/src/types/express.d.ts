import { JwtUserPayload } from './jwt-payload.types';

declare global {
  namespace Express {
    interface Request {
      user?: JwtUserPayload;
    }
  }
}
