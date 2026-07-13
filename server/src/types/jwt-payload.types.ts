import { JwtPayload } from "jsonwebtoken";

export interface JwtUserPayload extends JwtPayload {
  userId: string;
  email: string;
  role: "admin" | "company" | "employee";
  tenantId?: string;
  organisationId?: string;
}