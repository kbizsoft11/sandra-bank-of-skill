export interface User {
  _id: string;

  fullName: string;

  email: string;

  role: string;

  department?: string;

  location?: string;

  profileCompleted: boolean;

  createdAt: string;

  updatedAt: string;
}