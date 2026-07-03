export interface CreateUserDto {

  firstName: string;

  lastName?: string;

  email: string;

  password: string;

  role?: 'admin' | 'company' | 'employee';

  tenantId?: string;

  profileCompleted?: boolean;

  isActive?: boolean;

}