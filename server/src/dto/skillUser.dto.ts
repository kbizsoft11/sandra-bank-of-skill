import { Schema } from 'mongoose';

export interface CreateSkillUserDto {
  userId: string; // ObjectId as string
  skillId: string; // ObjectId as string
  score: number; // 0-100
  level: string; // Beginner, Intermediate, Advanced, Expert
  assessmentId?: string;
  questionnaireId?: string;
}

export interface UpdateSkillUserDto {
  score?: number; // 0-100
  level?: string;
  assessmentId?: string;
  lastAssessedAt?: Date;
}

export interface SkillUserResponseDto {
  _id: string;
  userId: string;
  skillId: string;
  skillName?: string; // Populated
  categoryId?: string; // From populated skill
  categoryName?: string; // Populated
  score: number;
  level: string;
  assessmentId?: string;
  questionnaireId?: string;
  lastAssessedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface GetSkillUsersQueryDto {
  page?: number;
  limit?: number;
  userId?: string;
  skillId?: string;
  level?: string;
}

export interface EmployeeSkillsResponseDto {
  _id: string;
  skillName: string;
  categoryId: string;
  categoryName: string;
  score: number;
  level: string;
  lastAssessedAt?: Date;
}
