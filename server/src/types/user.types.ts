import { UserRole } from "./common.types";

export interface IUser {
  firstName: string;
  lastName: string;
  email: string;
  password:string;
  role: UserRole;
  tenantId: string;
  department?: string;
  location?: string;
  profileCompleted: boolean;
  isActive: boolean;
}