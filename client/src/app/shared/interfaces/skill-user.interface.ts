/**
 * SkillUser Interface - Normalized user-skill relationship
 * 
 * This collection stores the many-to-many relationship between users and skills
 * with assessment metadata (score, level, last assessed date, etc.)
 */

export interface SkillUser {
  _id: string;
  userId: string;
  skillId: string;
  score: number; // 0-100, derived from level or questionnaire
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  assessmentId?: string; // Reference to formal assessment
  questionnaireId?: string; // Reference to questionnaire response
  lastAssessedAt: Date;
  createdAt: Date;
  updatedAt: Date;

  // Populated fields (from service layer)
  skill?: {
    _id: string;
    name: string;
    description?: string;
    createdType: 'ADMIN' | 'COMPANY';
  };
  skillCategory?: {
    _id: string;
    name: string;
    description?: string;
  };
}

export interface CreateSkillUserDto {
  userId: string;
  skillId: string;
  score: number;
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  assessmentId?: string;
  questionnaireId?: string;
}

export interface UpdateSkillUserDto {
  score?: number;
  level?: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  assessmentId?: string;
  lastAssessedAt?: Date;
}

export interface SkillUserResponse {
  _id: string;
  skillName: string;
  skillDescription?: string;
  categoryName: string;
  level: string;
  score: number;
  lastAssessedAt: Date;
  createdType: 'ADMIN' | 'COMPANY';
  isFromQuestionnaire: boolean;
}
