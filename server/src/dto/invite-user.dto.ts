export interface InviteUserDto {
  email: string;
  role?: 'admin' | 'company' | 'employee';
  fullName?: string;
  designationId?: string;
  message?: string;
}
