/**
 * Assessments Controller
 */

import { Request, Response } from 'express';
import { asyncHandler } from '../utils/async-handler';
import { sendResponse } from '../utils/api-response';
import { ApiError } from '../utils/api-error';
import { prismService } from '../services/prism.service';
import { userRepository } from '../repositories/user.repository';
import {
  PrismApiError,
  ICreateAssessmentPayload,
  IAssessmentStatusResponse,
  IAssessmentReportResponse,
  IMyAssessmentItem,
  IMyAssessmentsResponse,
  IFetchCandidateHistoryItem,
  QUEST_STATUS_MAP,
  QUEST_STATUS_LABELS,
  PrismQuestStatus,
} from '../types/assessment.types';
import { env } from '../config/env';
import { organisationRepository } from '../repositories/organisation.repository';

const makePrismOrgId = (organisationId: string): string => `BankOfSkill${organisationId.replace(/[^A-Za-z0-9]/g, '')}`;

const isOrganisationPrismClientId = (clientId: unknown): clientId is string => {
  if (typeof clientId !== 'string') return false;
  const value = clientId.trim();
  return value.length > 0
    && /^[A-Za-z0-9]+$/.test(value)
    && value.toLowerCase() !== env.PRISM_CLIENT_ID.trim().toLowerCase();
};

const makePrismClientEmail = (email: string | undefined, prismClientId: string): string => {
  const [localPart, domain] = (email || 'prism@bankofskill.com').split('@');
  const suffix = prismClientId.toLowerCase().replace(/[^a-z0-9]/g, '').slice(-24);
  const safeLocalPart = (localPart || 'prism').replace(/[^a-zA-Z0-9._+-]/g, '').slice(0, 32);
  return `${safeLocalPart}.prism.${suffix}@${domain || 'bankofskill.com'}`;
};

const resolvePrismClientId = async (employee: any): Promise<string> => {
  if (employee?.organisationId && /^[a-f\d]{24}$/i.test(employee.organisationId)) {
    const organisation = await organisationRepository.findById(employee.organisationId);
    if (organisation?.prismClientId) return organisation.prismClientId;
  }
  if (employee?.tenantId) {
    const organisation = await organisationRepository.findByTenantId(employee.tenantId);
    if (organisation?.prismClientId) return organisation.prismClientId;
  }
  return employee?.prismAssessment?.clientId || env.PRISM_CLIENT_ID;
};

const questionnaireTypeName = (qTypeId?: number): string | undefined => {
  // IDs documented by PRISM v2.5. These names are used only to select the
  // matching item when history contains multiple questionnaire types.
  const names: Record<number, string> = {
    1: 'professional',
    21: 'personal',
    4: 'foundation',
    19: 'select-online',
    29: 'career match',
    42: 'career explorer',
  };
  return qTypeId === undefined ? undefined : names[qTypeId];
};

const selectHistoryItem = (
  history: IFetchCandidateHistoryItem[],
  qTypeId?: number
): IFetchCandidateHistoryItem | undefined => {
  if (!history.length) return undefined;
  const expectedName = questionnaireTypeName(qTypeId);
  if (expectedName) {
    const matchingType = history.filter((item) =>
      (item.EntityType || item.QType || '').toLowerCase().includes(expectedName)
    );
    if (matchingType.length) return matchingType[matchingType.length - 1];
    // Never use another questionnaire type as a status fallback.
    return undefined;
  }
  // When PRISM does not expose QTypeId in history, prefer the completed/paid
  // item; otherwise use the latest item returned for this candidate.
  return history.find((item) => item.IsPaidFor || item.IsCompleted || !!item.DateCompleted) || history[history.length - 1];
};

const statusFromHistoryItem = (item?: IFetchCandidateHistoryItem) => {
  if (!item) {
    return { questStatus: 1 as PrismQuestStatus, isCompleted: false, isPaidFor: false, dateCompleted: null as string | null };
  }
  const isPaidFor = item.IsPaidFor === true;
  const isCompleted = item.IsCompleted === true || !!item.DateCompleted;
  return {
    questStatus: (isPaidFor ? 6 : isCompleted ? 4 : 2) as PrismQuestStatus,
    isCompleted,
    isPaidFor,
    dateCompleted: item.DateCompleted || null,
  };
};

const actionUrlFromHistoryItem = (item?: IFetchCandidateHistoryItem): string => {
  const value = item?.SubActionURL1?.trim() || '';
  return /^https?:\/\//i.test(value) ? value : '';
};

const secondaryActionUrlFromHistoryItem = (item?: IFetchCandidateHistoryItem): string => {
  const value = item?.SubActionURL2?.trim() || '';
  return /^https?:\/\//i.test(value) ? value : '';
};

const canAccessEmployeeAssessment = (
  requesterUser: any,
  targetEmployeeId: string,
  targetEmployeeOrgId: string
): boolean => {
  if (requesterUser.role === 'admin') return true;
  if (requesterUser.role === 'company' && requesterUser.organisationId === targetEmployeeOrgId) return true;
  if (requesterUser.role === 'employee' && requesterUser.userId === targetEmployeeId) return true;
  return false;
};

const shouldRefetchFromPrism = (lastFetchedAt?: Date, ttlMinutes: number = 5): boolean => {
  if (!lastFetchedAt) return true;
  const now = new Date();
  const diff = now.getTime() - new Date(lastFetchedAt).getTime();
  const minutes = diff / (1000 * 60);
  return minutes > ttlMinutes;
};

export const createAssessment = asyncHandler(async (req: Request, res: Response) => {
  const { employeeId, qTypeId } = req.body as ICreateAssessmentPayload;
  const requester = req.user;

  if (!employeeId) throw new ApiError(400, 'Employee ID is required');

  const employee = await userRepository.findById(employeeId);
  if (!employee) throw new ApiError(404, 'Employee not found');

  if (!canAccessEmployeeAssessment(requester, employeeId, employee.organisationId || employee.tenantId || '')) {
    throw new ApiError(403, 'You do not have permission to create assessments for this employee');
  }

  if (employee.prismAssessment?.questionnaire?.questId) {
    return sendResponse(res, 200, 'Assessment already exists', {
      questId: employee.prismAssessment.questionnaire.questId,
      randomCode: employee.prismAssessment.questionnaire.randomCode,
      actionUrl: employee.prismAssessment.questionnaire.actionUrl,
      questStatus: employee.prismAssessment.questStatus,
      questStatusLabel: QUEST_STATUS_LABELS[employee.prismAssessment.questStatus as PrismQuestStatus],
    });
  }

  const organisationId = employee.organisationId || employee.tenantId || '';
  if (!organisationId) throw new ApiError(400, 'Employee must belong to an organisation');

  try {
    const organisation = employee.organisationId && /^[a-f\d]{24}$/i.test(employee.organisationId)
      ? await organisationRepository.findById(employee.organisationId)
      : employee.tenantId
        ? await organisationRepository.findByTenantId(employee.tenantId)
        : null;
    // The configured PRISM_CLIENT_ID is the master client used only by
    // CreateClient. Every organisation must have its own child ClientID.
    const hasValidOrganisationClient = isOrganisationPrismClientId(organisation?.prismClientId);
    const prismClientId = hasValidOrganisationClient
      ? organisation!.prismClientId!.trim()
      : makePrismOrgId(organisationId);

    // PRISM requires a separate Client for every organisation. The OrgID used
    // here becomes ClientID on every candidate created for that organisation.
    if (!hasValidOrganisationClient) {
      const creatorName = requester?.fullName?.trim().split(/\s+/) || [];
      try {
        await prismService.createClient({
          forename: creatorName[0] || 'Bank',
          surname: creatorName.slice(1).join(' ') || 'of Skill',
          orgName: organisation?.organisationName || `Organisation ${organisationId}`,
          orgId: prismClientId,
          // PRISM requires the client user email to be unique per client.
          // Keep it deterministic so retries use the same email.
          email: makePrismClientEmail(requester?.email, prismClientId),
        });
      } catch (error) {
        // The client may have been created successfully before a previous
        // request failed while parsing PRISM's non-standard success response.
        const message = error instanceof PrismApiError ? error.prismMessage : '';
        if (!/already exists|client exists|registered/i.test(message)) throw error;
      }
      if (organisation) await organisationRepository.update(organisation._id.toString(), { prismClientId });
    }

    const prismResponse = await prismService.createCandidate(
      prismClientId,
      employeeId,
      qTypeId || env.PRISM_DEFAULT_QTYPE_ID,
      {
        fullName: employee.fullName,
        email: employee.email,
        organisationName: organisation?.organisationName || `Organisation ${organisationId}`,
      }
    );

    // PRISM returns RandomCode immediately, QuestId comes after employee accepts terms
    // Use RandomCode as the identifier for now
    const questId = prismResponse.QuestId || prismResponse.RandomCode || '';
    const randomCode = prismResponse.RandomCode || '';
    const actionUrl = prismResponse.ActionURL2 || prismResponse.ActionURL3 || prismResponse.ActionUrl || prismResponse.ActionURL1 || '';
    const questStatus = prismResponse.QuestStatus || 2;

    const updateResult = await userRepository.update(employeeId, {
      prismAssessment: {
        clientId: prismClientId,
        externalIdent: employeeId,
        questStatus: questStatus as PrismQuestStatus,
        lastFetchedAt: new Date(),
        questionnaire: {
          qTypeId: qTypeId || env.PRISM_DEFAULT_QTYPE_ID,
          questId: questId,
          randomCode: randomCode,
          actionUrl: actionUrl,
        },
      },
    } as any);

    console.log('✅ Assessment saved to MongoDB:', {
      employeeId,
      hasPrismAssessment: !!updateResult?.prismAssessment,
      hasQuestionnaire: !!updateResult?.prismAssessment?.questionnaire,
      actionUrl: updateResult?.prismAssessment?.questionnaire?.actionUrl,
    });

    return sendResponse(res, 201, 'Assessment created successfully', {
      questId: questId,
      randomCode: randomCode,
      actionUrl: actionUrl,
      questStatus: questStatus,
      questStatusLabel: QUEST_STATUS_LABELS[questStatus as PrismQuestStatus] || 'Ready to Take',
    });
  } catch (error) {
    if (error instanceof PrismApiError) {
      throw new ApiError(error.statusCode, error.message);
    }
    throw error;
  }
});

export const getAssessmentStatus = asyncHandler(async (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const requester = req.user;
  const forceRefresh = req.query.refresh === 'true';

  if (!employeeId || Array.isArray(employeeId)) throw new ApiError(400, 'Invalid Employee ID');

  const employee = await userRepository.findById(employeeId);
  if (!employee) throw new ApiError(404, 'Employee not found');

  if (!canAccessEmployeeAssessment(requester, employeeId, employee.organisationId || employee.tenantId || '')) {
    throw new ApiError(403, 'You do not have permission to view this assessment');
  }

  const shouldRefresh =
    forceRefresh ||
    !employee.prismAssessment ||
    (!employee.prismAssessment.questionnaire?.questId && shouldRefetchFromPrism(employee.prismAssessment.lastFetchedAt));

  try {
    const prismClientId = await resolvePrismClientId(employee);
    if (employee.prismAssessment?.questionnaire) {
      // Just check status without losing questionnaire data
      const history = await prismService.fetchCandidateHistory(employeeId, prismClientId);

      
      const firstItem = selectHistoryItem(history.HistoryList || [], employee.prismAssessment.questionnaire.qTypeId);
      
      if (firstItem) {
        const historyStatus = statusFromHistoryItem(firstItem);
        const historyActionUrl = actionUrlFromHistoryItem(firstItem);
        await userRepository.update(employeeId, {
          prismAssessment: {
            ...employee.prismAssessment,
            questStatus: historyStatus.questStatus,
            lastFetchedAt: new Date(),
            // Preserve existing questionnaire data
            questionnaire: {
              ...employee.prismAssessment.questionnaire,
              actionUrl: historyActionUrl || employee.prismAssessment.questionnaire.actionUrl,
            },
          },
        } as any);

        const response: IAssessmentStatusResponse = {
          questStatus: historyStatus.questStatus,
          questStatusLabel: QUEST_STATUS_LABELS[historyStatus.questStatus],
          existsInPrism: true,
          questionnaire: employee.prismAssessment.questionnaire,
          lastFetchedAt: new Date(),
        };

        return sendResponse(res, 200, 'Assessment status retrieved', response);
      }
    }

    // No questionnaire data exists, fetch full history
    const history = await prismService.fetchCandidateHistory(employeeId, prismClientId);
    const firstItem = selectHistoryItem(history.HistoryList || [], employee.prismAssessment?.questionnaire?.qTypeId);

    if (!firstItem) {
      // No history found
      return sendResponse(res, 200, 'No assessment history', {
        questStatus: 1,
        questStatusLabel: QUEST_STATUS_LABELS[1],
        existsInPrism: false,
        lastFetchedAt: new Date(),
      });
    }

    const historyStatus = statusFromHistoryItem(firstItem);
    const updateData: any = {
      prismAssessment: {
        clientId: employee.prismAssessment?.clientId,
        externalIdent: employeeId,
        questStatus: historyStatus.questStatus,
        lastFetchedAt: new Date(),
      },
    };

    // Only set questionnaire if we have QuestId/RandomCode from history
    if (firstItem.QuestId || firstItem.RandomCode) {
      updateData.prismAssessment.questionnaire = {
        qTypeId: firstItem.QTypeId || env.PRISM_DEFAULT_QTYPE_ID,
        questId: firstItem.QuestId || firstItem.RandomCode || '',
        randomCode: firstItem.RandomCode || '',
        actionUrl: actionUrlFromHistoryItem(firstItem) || secondaryActionUrlFromHistoryItem(firstItem),
      };
    }

    await userRepository.update(employeeId, updateData);

    const response: IAssessmentStatusResponse = {
      questStatus: historyStatus.questStatus,
      questStatusLabel: QUEST_STATUS_LABELS[historyStatus.questStatus],
      existsInPrism: true,
      questionnaire: updateData.prismAssessment.questionnaire,
      lastFetchedAt: new Date(),
    };

    return sendResponse(res, 200, 'Assessment status retrieved', response);
  } catch (error) {
    if (error instanceof PrismApiError) {
      throw new ApiError(error.statusCode, error.message);
    }
    throw error;
  }
});

export const getMyAssessments = asyncHandler(async (req: Request, res: Response) => {
  const requester = req.user;

  if (!requester || requester.role !== 'employee') {
    throw new ApiError(403, 'Only employees can access their own assessments');
  }

  // Use userId from JWT token (not _id) as per known bug pattern
  const employeeId = requester.userId || requester._id;

  
  if (!employeeId) {
    throw new ApiError(400, 'Employee ID not found in token');
  }

  const assessments: IMyAssessmentItem[] = [];

  try {
    // Simply get employee data from MongoDB
    const employee = await userRepository.findById(employeeId);

  
    
    // Refresh the cached status from the organisation-specific PRISM client
    // whenever the employee dashboard is opened.
    if (employee?.prismAssessment?.questionnaire?.actionUrl) {
      const questionnaire = employee.prismAssessment.questionnaire;
      let lastFetchedAt = employee.prismAssessment.lastFetchedAt
        ? new Date(employee.prismAssessment.lastFetchedAt)
        : undefined;
      let historyStatus = statusFromHistoryItem();
      let historyActionUrl = '';

      try {
        const prismClientId = await resolvePrismClientId(employee);
        const history = await prismService.fetchCandidateHistory(employeeId, prismClientId);

        const latest = selectHistoryItem(history.HistoryList || [], questionnaire.qTypeId);
        historyStatus = statusFromHistoryItem(latest);
        historyActionUrl = actionUrlFromHistoryItem(latest);
        if (latest) {
          lastFetchedAt = new Date();
          await userRepository.update(employeeId, {
            prismAssessment: {
              ...employee.prismAssessment,
              clientId: prismClientId,
              questStatus: historyStatus.questStatus,
              lastFetchedAt,
            },
          } as any);
        }
      } catch (error) {
        // Keep the cached assignment visible if PRISM is temporarily unavailable.
        console.warn('Unable to refresh employee PRISM status:', employeeId, error);
      }

      const assessment = {
        entityType: 'PRISM Brain Mapping Assessment',
        qTypeId: questionnaire?.qTypeId || env.PRISM_DEFAULT_QTYPE_ID,
        isCompleted: historyStatus.isCompleted,
        isPaidFor: historyStatus.isPaidFor,
        dateSent: lastFetchedAt?.toISOString() || (employee.createdAt ? new Date(employee.createdAt).toISOString() : new Date().toISOString()),
        dateCompleted: historyStatus.dateCompleted,
        takeAssessmentUrl: historyActionUrl || (!historyStatus.isCompleted ? questionnaire?.actionUrl || '' : ''),
        questStatus: historyStatus.questStatus,
        questStatusLabel: QUEST_STATUS_LABELS[historyStatus.questStatus] || 'Ready to Take',
      };
      
      console.log('✅ Assessment added:', assessment);
      assessments.push(assessment);
    } else {
      console.log('❌ No assessment with actionUrl found');
    }
  } catch (error) {
    console.error('❌ Error fetching my assessments:', error);
  }

  console.log('📤 Returning assessments:', assessments);

  const response: IMyAssessmentsResponse = {
    assessments,
  };

  return sendResponse(res, 200, assessments.length > 0 ? 'Assessment found' : 'No assessments assigned yet', response);
});

export const getAssessmentReport = asyncHandler(async (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const requester = req.user;
  const requestedEntityTypeId = parseInt(req.query.entityTypeId as string);
  const onetCode = req.query.onetCode as string;

  if (!employeeId || Array.isArray(employeeId)) throw new ApiError(400, 'Invalid Employee ID');

  const employee = await userRepository.findById(employeeId);
  if (!employee) throw new ApiError(404, 'Employee not found');

  if (!canAccessEmployeeAssessment(requester, employeeId, employee.organisationId || employee.tenantId || '')) {
    throw new ApiError(403, 'You do not have permission to view this report');
  }

  if (!employee.prismAssessment) throw new ApiError(404, 'Assessment not found');

  const entityTypeId = Number.isInteger(requestedEntityTypeId) && requestedEntityTypeId > 0
    ? requestedEntityTypeId
    : employee.prismAssessment.questionnaire?.qTypeId || env.PRISM_DEFAULT_QTYPE_ID;

  try {
    const prismClientId = employee.prismAssessment.clientId || env.PRISM_CLIENT_ID;
    // PRISM is the source of truth for completion/payment. Refresh history
    // before checking report access so stale MongoDB status cannot block a
    // report that is already unlocked in PRISM.
    const history = await prismService.fetchCandidateHistory(employeeId, prismClientId);
    const historyItem = selectHistoryItem(
      history.HistoryList || [],
      employee.prismAssessment.questionnaire?.qTypeId || entityTypeId
    );
    const historyStatus = statusFromHistoryItem(historyItem);

    const currentAssessment = {
      ...employee.prismAssessment,
      questStatus: historyStatus.questStatus,
      lastFetchedAt: new Date(),
    };
    await userRepository.update(employeeId, { prismAssessment: currentAssessment } as any);

    if (!historyItem || !historyStatus.isPaidFor) {
      throw new ApiError(400, 'Report is not unlocked. Please unlock the report first (status must be paid in PRISM).');
    }

    if (employee.prismAssessment.report?.reportData) {
      const response: IAssessmentReportResponse = {
        questStatus: historyStatus.questStatus,
        questStatusLabel: QUEST_STATUS_LABELS[historyStatus.questStatus],
        reportData: employee.prismAssessment.report.reportData,
        basicMapUrl: employee.prismAssessment.report.basicMapUrl,
        fullMapUrl: employee.prismAssessment.report.fullMapUrl,
        unlockedAt: employee.prismAssessment.report.unlockedAt,
      };
      return sendResponse(res, 200, 'Assessment report retrieved (cached)', response);
    }

    const reportData = await prismService.fetchMergedReportData(employeeId, entityTypeId, onetCode, prismClientId);
    const basicMapUrl = await prismService.fetchBasicMap(employeeId, entityTypeId, onetCode || '', prismClientId);
    const fullMapUrl = await prismService.fetchFullMap(employeeId, entityTypeId, onetCode || '', prismClientId);

    await userRepository.update(employeeId, {
      prismAssessment: {
        ...currentAssessment,
        report: {
          reportData,
          basicMapUrl,
          fullMapUrl,
          unlockedAt: employee.prismAssessment.report?.unlockedAt || new Date(),
        },
      },
    } as any);

    const response: IAssessmentReportResponse = {
      questStatus: historyStatus.questStatus,
      questStatusLabel: QUEST_STATUS_LABELS[historyStatus.questStatus],
      reportData,
      basicMapUrl,
      fullMapUrl,
      unlockedAt: employee.prismAssessment.report?.unlockedAt || new Date(),
    };

    return sendResponse(res, 200, 'Assessment report retrieved', response);
  } catch (error) {
    if (error instanceof PrismApiError) {
      throw new ApiError(error.statusCode, error.message);
    }
    throw error;
  }
});

export const getAssessmentMap = asyncHandler(async (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const requester = req.user;
  const mapType = (req.query.type as string) || 'basic';

  if (!employeeId || Array.isArray(employeeId)) throw new ApiError(400, 'Invalid Employee ID');

  const employee = await userRepository.findById(employeeId);
  if (!employee) throw new ApiError(404, 'Employee not found');

  if (!canAccessEmployeeAssessment(requester, employeeId, employee.organisationId || employee.tenantId || '')) {
    throw new ApiError(403, 'You do not have permission to view this map');
  }

  if (!employee.prismAssessment || employee.prismAssessment.questStatus !== 6) {
    throw new ApiError(400, 'Report must be unlocked to view brain map');
  }

  try {
    let mapUrl: string;
    if (mapType === 'full') {
      mapUrl = employee.prismAssessment.report?.fullMapUrl || (await prismService.fetchFullMap(
        employeeId,
        employee.prismAssessment.questionnaire?.qTypeId || env.PRISM_DEFAULT_QTYPE_ID,
        '',
        employee.prismAssessment.clientId || env.PRISM_CLIENT_ID
      ));
    } else {
      mapUrl = employee.prismAssessment.report?.basicMapUrl || (await prismService.fetchBasicMap(
        employeeId,
        employee.prismAssessment.questionnaire?.qTypeId || env.PRISM_DEFAULT_QTYPE_ID,
        '',
        employee.prismAssessment.clientId || env.PRISM_CLIENT_ID
      ));
    }

    return sendResponse(res, 200, 'Brain map retrieved', { mapUrl, mapType });
  } catch (error) {
    if (error instanceof PrismApiError) {
      throw new ApiError(error.statusCode, error.message);
    }
    throw error;
  }
});

export const unlockAssessmentReport = asyncHandler(async (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const requester = req.user;

  if (!employeeId || Array.isArray(employeeId)) throw new ApiError(400, 'Invalid Employee ID');

  const employee = await userRepository.findById(employeeId);
  if (!employee) throw new ApiError(404, 'Employee not found');

  if (
    !requester ||
    (requester.role !== 'admin' &&
    !(requester.role === 'company' && requester.organisationId === employee.organisationId))
  ) {
    throw new ApiError(403, 'Only admins or company owners can unlock reports');
  }

  if (!employee.prismAssessment) throw new ApiError(404, 'Assessment not found');

  if (employee.prismAssessment.questStatus === 6) {
    return sendResponse(res, 200, 'Report is already unlocked', {
      questStatus: 6,
      questStatusLabel: 'Report Available',
      unlockedAt: employee.prismAssessment.report?.unlockedAt,
    });
  }

  if (![3, 4].includes(employee.prismAssessment.questStatus)) {
    throw new ApiError(400, 'Assessment must be completed before unlocking the report');
  }

  try {
    const entityTypeId = employee.prismAssessment.questionnaire?.qTypeId || env.PRISM_DEFAULT_QTYPE_ID;
    await prismService.unlockReport(
      employeeId,
      entityTypeId,
      employee.prismAssessment.clientId || env.PRISM_CLIENT_ID
    );

    const now = new Date();
    await userRepository.update(employeeId, {
      prismAssessment: {
        ...employee.prismAssessment,
        questStatus: 6,
        lastFetchedAt: now,
        report: {
          ...(employee.prismAssessment.report || {}),
          unlockedAt: now,
        },
      },
    } as any);

    return sendResponse(res, 200, 'Report unlocked successfully', {
      questStatus: 6,
      questStatusLabel: 'Report Available',
      unlockedAt: now,
    });
  } catch (error) {
    if (error instanceof PrismApiError) {
      throw new ApiError(error.statusCode, error.message);
    }
    throw error;
  }
});

export const getOrganisationAssessments = asyncHandler(async (req: Request, res: Response) => {
  const { organisationId } = req.params;
  const requester = req.user;

  if (!organisationId || Array.isArray(organisationId)) throw new ApiError(400, 'Invalid Organisation ID');

  if (
    !requester ||
    (requester.role !== 'admin' &&
    !(requester.role === 'company' && (requester.organisationId === organisationId || requester.tenantId === organisationId)))
  ) {
    throw new ApiError(403, 'You do not have permission to view these assessments');
  }

  // Try to find employees by organisationId first, then by tenantId
  let employees = await userRepository.findAll('employee', organisationId);
  
  // If no employees found with organisationId, try with tenantId (for backward compatibility)
  if (!employees || employees.length === 0) {
    const user = await userRepository.findAll('employee', undefined);
    employees = user.filter(u => u.tenantId === organisationId || u.organisationId === organisationId);
  }

  const assessments = await Promise.all(employees.map(async (employee) => {
    let historyStatus = statusFromHistoryItem();
    let historyActionUrl = '';
    let lastFetchedAt = employee.prismAssessment?.lastFetchedAt;

    if (employee.prismAssessment) {
      try {
        const prismClientId = await resolvePrismClientId(employee);
        const history = await prismService.fetchCandidateHistory(employee._id.toString(), prismClientId);
        const item = selectHistoryItem(history.HistoryList || [], employee.prismAssessment.questionnaire?.qTypeId);
        historyStatus = statusFromHistoryItem(item);
        historyActionUrl = actionUrlFromHistoryItem(item);
        lastFetchedAt = new Date();

        await userRepository.update(employee._id.toString(), {
          prismAssessment: {
            ...employee.prismAssessment,
            clientId: prismClientId,
            questStatus: historyStatus.questStatus,
            lastFetchedAt,
          },
        } as any);
      } catch (error) {
        console.warn('Unable to refresh organisation PRISM status:', employee._id.toString(), error);
      }
    }

    return {
      employeeId: employee._id,
      fullName: employee.fullName,
      email: employee.email,
      department: employee.department,
      title: employee.title,
      profileImage: employee.profileImage,
      assessment: employee.prismAssessment
        ? {
            questStatus: historyStatus.questStatus,
            questStatusLabel: QUEST_STATUS_LABELS[historyStatus.questStatus],
            lastFetchedAt,
            hasQuestionnaire: !!employee.prismAssessment.questionnaire?.questId,
            isUnlocked: historyStatus.isPaidFor,
            actionUrl: historyActionUrl,
          }
        : null,
    };
  }));

  return sendResponse(res, 200, 'Organisation assessments retrieved', {
    organisationId,
    assessments,
    total: assessments.length,
    summary: {
      notStarted: assessments.filter((a) => !a.assessment || a.assessment.questStatus === 1).length,
      inProgress: assessments.filter((a) => a.assessment && a.assessment.questStatus === 2).length,
      completed: assessments.filter((a) => a.assessment && [3, 4].includes(a.assessment.questStatus)).length,
      unlocked: assessments.filter((a) => a.assessment && a.assessment.questStatus === 6).length,
    },
  });
});
