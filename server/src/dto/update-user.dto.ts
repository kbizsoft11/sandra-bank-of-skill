export interface UpdateUserDto {

  fullName?: string;

  email?: string;

  role?: 'admin' | 'company' | 'employee';

  tenantId?: string;

  profileCompleted?: boolean;

  isActive?: boolean;

}