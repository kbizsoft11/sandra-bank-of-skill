export interface AuthUser {
  _id: string;
  fullName: string;
  email: string;
  role: string;
  tenantId: string;
  profileCompleted: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}