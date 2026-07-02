import { AuthUser } from './auth-user.interface';

export interface AuthResponseData {
  token: string;
  user: AuthUser;
}