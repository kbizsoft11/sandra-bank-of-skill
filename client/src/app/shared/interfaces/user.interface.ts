export interface User {
  _id: string;

  firstName: string;

  lastName: string;

  email: string;

  role: string;

  department?: string;

  location?: string;

  profileCompleted: boolean;

  createdAt: string;

  updatedAt: string;
}