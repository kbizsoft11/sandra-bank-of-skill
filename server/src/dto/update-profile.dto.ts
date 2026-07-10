export interface UpdateProfileDto {
  fullName?: string;
  title?: string;
  bio?: string;
  socialLinks?: {
    facebook?: string;
    twitter?: string;
    linkedin?: string;
  };
}
