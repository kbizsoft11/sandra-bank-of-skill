/**
 * PRISM Brain Mapping Assessment Types
 * 
 * Type definitions for PRISM API integration
 */

/**
 * PRISM Questionnaire Status
 * 1 = Not exists (not yet created in PRISM)
 * 2 = Exists (created, not started)
 * 3 = Completed (questionnaire completed by employee)
 * 4 = Accepted (results accepted/submitted)
 * 5 = Deleted (deleted from PRISM)
 * 6 = Paid (report unlocked/subscribed)
 */
export type PrismQuestStatus = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Quest Status human-readable mapping
 */
export const QUEST_STATUS_MAP: Record<PrismQuestStatus, string> = {
  1: 'not_exists',
  2: 'exists',
  3: 'completed',
  4: 'accepted',
  5: 'deleted',
  6: 'paid',
};

/**
 * Quest Status display labels
 */
export const QUEST_STATUS_LABELS: Record<PrismQuestStatus, string> = {
  1: 'Ready to Take',      // Changed from 'Not Started' - if created, it's ready
  2: 'Ready to Take',
  3: 'Completed',
  4: 'Submitted',
  5: 'Deleted',
  6: 'Report Available',
};

/**
 * PRISM Assessment embedded in User document
 */
export interface IPrismAssessment {
  externalIdent: string;
  /** Organisation-specific PRISM ClientID used for all candidate calls. */
  clientId?: string;
  questStatus: PrismQuestStatus;
  lastFetchedAt: Date;
  questionnaire?: {
    qTypeId: number;
    questId: string;
    randomCode: string;
    actionUrl?: string;
  };
  report?: {
    reportData?: Record<string, any>;
    basicMapUrl?: string;
    fullMapUrl?: string;
    unlockedAt?: Date;
  };
}

/**
 * PRISM API Response structure
 */
export interface IPrismApiResponse {
  ResponseStatus: number;
  ResponseMessage?: string;
  IsAuthorised?: boolean;
  [key: string]: any;
}

/**
 * Create Candidate Request
 */
export interface ICreateCandidateRequest {
  SiteID: string;
  ClientID: string;
  ExternalIdent: string;
  ParentExternalIdent?: string;
  QTypeID: number;
  Forename?: string;
  Surname?: string;
  Organisation?: string;
  Reference?: string;
  Email?: string;
  Gender?: boolean;
  LangID?: number;
  CreateUser?: boolean;
  IsGift?: boolean;
  AccID?: number;
}

export interface ICreateClientRequest {
  SiteID: string;
  ClientID: string;
  Forename: string;
  Surname: string;
  OrgName: string;
  OrgID: string;
  Email: string;
}

/**
 * Create Candidate Response
 */
export interface ICreateCandidateResponse {
  QuestId?: string;
  RandomCode: string;
  ActionUrl: string;
  QuestStatus?: PrismQuestStatus;
  ResponseStatus?: number;
  ResponseMessage?: string;
  IsAuthorised?: boolean;
  ActionURL1?: string;
  ActionURL2?: string;
  ActionURL3?: string;
  ActionURL4?: string;
}

/**
 * Fetch Candidate History Request
 */
export interface IFetchCandidateHistoryRequest {
  SiteID: string;
  ClientID: string;
  ExternalIdent: string;
}

/**
 * Fetch Candidate History Response Item
 */
export interface IFetchCandidateHistoryItem {
  CandidateName: string;
  QType: string;
  QTypeId: number;
  DateSent: string;
  DateCompleted: string | null;
  QuestStatus: PrismQuestStatus;
  QuestId?: string;
  RandomCode?: string;
  SubActionURL1?: string; // Current action URL based on state
  IsPaidFor?: boolean;
}

/**
 * Fetch Candidate History Response (Full from API)
 */
export interface IFetchCandidateHistoryResponse {
  HistoryList: IFetchCandidateHistoryItem[];
  ResponseStatus: number;
  ResponseMessage?: string;
}

/**
 * Simple Status Response (for backward compatibility)
 */
export interface ISimpleHistoryResponse {
  QuestStatus: PrismQuestStatus;
  QuestId?: string;
  RandomCode?: string;
  QTypeId?: number;
  ExistsInPrism: boolean;
}

/**
 * Unlock Report Request
 */
export interface IUnlockReportRequest {
  SiteID: string;
  ClientID: string;
  ExternalIdent: string;
  ParentExternalIdent: string;
}

/**
 * Fetch Report Data Request
 */
export interface IFetchReportDataRequest {
  SiteID: string;
  ClientID: string;
  ExternalIdent: string;
  EntityTypeID: number;
  ONetCode?: string;
}

/**
 * Fetch Report EI Data Request
 */
export interface IFetchReportEIDataRequest {
  SiteID: string;
  ClientID: string;
  ExternalIdent: string;
  EntityTypeID: number;
}

/**
 * My Assessment Item (for employee view)
 */
export interface IMyAssessmentItem {
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

/**
 * My Assessments Response
 */
export interface IMyAssessmentsResponse {
  assessments: IMyAssessmentItem[];
}

/**
 * Check Entity Exists Request
 */
export interface ICheckEntityExistsRequest {
  SiteID: string;
  ClientID: string;
  ExternalIdent: string;
}

/**
 * PRISM API Error
 */
export class PrismApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public prismResponseStatus: number,
    public prismMessage: string
  ) {
    super(message);
    this.name = 'PrismApiError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Assessment creation payload
 */
export interface ICreateAssessmentPayload {
  employeeId: string;
  qTypeId?: number;
}

/**
 * Assessment status response
 */
export interface IAssessmentStatusResponse {
  questStatus: PrismQuestStatus;
  questStatusLabel: string;
  existsInPrism: boolean;
  questionnaire?: {
    qTypeId: number;
    questId: string;
    actionUrl: string;
    randomCode: string;
  };
  lastFetchedAt?: Date;
}

/**
 * Assessment report response
 */
export interface IAssessmentReportResponse {
  questStatus: PrismQuestStatus;
  questStatusLabel: string;
  reportData?: Record<string, any>;
  basicMapUrl?: string;
  fullMapUrl?: string;
  unlockedAt?: Date;
}
