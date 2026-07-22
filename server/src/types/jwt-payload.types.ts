import { JwtPayload } from "jsonwebtoken";

export interface JwtUserPayload extends JwtPayload {
  userId: string;
  email: string;
  fullName?: string;
  role: "admin" | "company" | "employee";
  tenantId?: string;
  organisationId?: string;
  isImpersonated?: boolean;
  impersonatedBy?: string;
}