/**
 * PRISM Assessment Interfaces
 */

export type PrismQuestStatus = 1 | 2 | 3 | 4 | 5 | 6;

export interface AssessmentStatus {
  questStatus: PrismQuestStatus;
  questStatusLabel: string;
  existsInPrism: boolean;
  questionnaire?: {
    qTypeId: number;
    questId: string;
    actionUrl: string;
    randomCode: string;
  };
  lastFetchedAt?: Date | string;
}

export interface AssessmentReport {
  questStatus: PrismQuestStatus;
  questStatusLabel: string;
  reportData?: Record<string, any>;
  basicMapUrl?: string;
  fullMapUrl?: string;
  unlockedAt?: Date | string;
}

export interface AssessmentMap {
  mapUrl: string;
  mapType: 'basic' | 'full';
}

export interface CreateAssessmentPayload {
  employeeId: string;
  qTypeId?: number;
}

export interface CreateAssessmentResponse {
  questId: string;
  randomCode: string;
  actionUrl: string;
  questStatus: PrismQuestStatus;
  questStatusLabel: string;
}

export interface UnlockAssessmentResponse {
  questStatus: PrismQuestStatus;
  questStatusLabel: string;
  unlockedAt: Date | string;
}

export interface EmployeeAssessment {
  employeeId: string;
  fullName: string;
  email: string;
  department?: string;
  title?: string;
  profileImage?: string;
  assessment: {
    questStatus: PrismQuestStatus;
    questStatusLabel: string;
    lastFetchedAt?: Date | string;
    hasQuestionnaire: boolean;
    isUnlocked: boolean;
  } | null;
}

export interface OrganisationAssessments {
  organisationId: string;
  assessments: EmployeeAssessment[];
  total: number;
  summary: {
    notStarted: number;
    inProgress: number;
    completed: number;
    unlocked: number;
  };
}

export interface MyAssessmentItem {
  entityType: string;
  qTypeId: number;
  isCompleted: boolean;
  isPaidFor: boolean;
  dateSent: string;
  dateCompleted: string | null;
  takeAssessmentUrl: string;
  questStatus: PrismQuestStatus;
  questStatusLabel: string;
  error?: boolean;
  errorMessage?: string;
}

export interface QuestStatusConfig {
  label: string;
  badgeClass: string;
  icon?: string;
  description: string;
}

export const QUEST_STATUS_CONFIG: Record<PrismQuestStatus, QuestStatusConfig> = {
  1: {
    label: 'Not Started',
    badgeClass: 'badge-gray',
    icon: 'circle',
    description: 'Assessment has not been created yet',
  },
  2: {
    label: 'Ready to Take',
    badgeClass: 'badge-blue',
    icon: 'play-circle',
    description: 'Assessment is ready to be taken',
  },
  3: {
    label: 'Completed',
    badgeClass: 'badge-green',
    icon: 'check-circle',
    description: 'Assessment has been completed',
  },
  4: {
    label: 'Submitted',
    badgeClass: 'badge-cyan',
    icon: 'check-double',
    description: 'Results have been submitted',
  },
  5: {
    label: 'Deleted',
    badgeClass: 'badge-red',
    icon: 'x-circle',
    description: 'Assessment has been deleted',
  },
  6: {
    label: 'Report Available',
    badgeClass: 'badge-purple',
    icon: 'file-text',
    description: 'Full report is available to view',
  },
};
