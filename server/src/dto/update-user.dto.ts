export interface UpdateUserDto {

  firstName?: string;

  lastName?: string;

  email?: string;

  role?: 'admin' | 'company' | 'employee';

  tenantId?: string;

  profileCompleted?: boolean;

  isActive?: boolean;

}