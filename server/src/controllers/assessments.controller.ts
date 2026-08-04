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
  QUEST_STATUS_MAP,
  QUEST_STATUS_LABELS,
  PrismQuestStatus,
} from '../types/assessment.types';
import { env } from '../config/env';

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
    const prismResponse = await prismService.createCandidate(
      employeeId,
      organisationId,
      qTypeId || env.PRISM_DEFAULT_QTYPE_ID,
      {
        fullName: employee.fullName,
        email: employee.email,
        organisationName: employee.organisationId || organisationId,
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

  // Always return cached data if questionnaire with actionUrl exists
  if (!forceRefresh && employee.prismAssessment?.questionnaire?.actionUrl) {
    const response: IAssessmentStatusResponse = {
      questStatus: employee.prismAssessment.questStatus,
      questStatusLabel: QUEST_STATUS_LABELS[employee.prismAssessment.questStatus as PrismQuestStatus],
      existsInPrism: employee.prismAssessment.questStatus !== 1,
      questionnaire: employee.prismAssessment.questionnaire,
      lastFetchedAt: employee.prismAssessment.lastFetchedAt,
    };
    return sendResponse(res, 200, 'Assessment status retrieved (cached with actionUrl)', response);
  }

  if (!shouldRefresh && employee.prismAssessment) {
    const response: IAssessmentStatusResponse = {
      questStatus: employee.prismAssessment.questStatus,
      questStatusLabel: QUEST_STATUS_LABELS[employee.prismAssessment.questStatus as PrismQuestStatus],
      existsInPrism: employee.prismAssessment.questStatus !== 1,
      questionnaire: employee.prismAssessment.questionnaire,
      lastFetchedAt: employee.prismAssessment.lastFetchedAt,
    };
    return sendResponse(res, 200, 'Assessment status retrieved (cached)', response);
  }

  try {
    const exists = await prismService.checkEntityExists(employeeId);

    if (!exists) {
      await userRepository.update(employeeId, {
        prismAssessment: {
          externalIdent: employeeId,
          questStatus: 1,
          lastFetchedAt: new Date(),
        },
      } as any);

      return sendResponse(res, 200, 'Assessment not started', {
        questStatus: 1,
        questStatusLabel: QUEST_STATUS_LABELS[1],
        existsInPrism: false,
        lastFetchedAt: new Date(),
      });
    }

    // Entity exists in PRISM
    // If we already have questionnaire data, preserve it and only update status
    if (employee.prismAssessment?.questionnaire) {
      // Just check status without losing questionnaire data
      const history = await prismService.fetchCandidateHistory(employeeId);
      const firstItem = history.HistoryList?.[0];
      
      if (firstItem) {
        await userRepository.update(employeeId, {
          prismAssessment: {
            ...employee.prismAssessment,
            questStatus: firstItem.QuestStatus,
            lastFetchedAt: new Date(),
            // Preserve existing questionnaire data
            questionnaire: employee.prismAssessment.questionnaire,
          },
        } as any);

        const response: IAssessmentStatusResponse = {
          questStatus: firstItem.QuestStatus,
          questStatusLabel: QUEST_STATUS_LABELS[firstItem.QuestStatus as PrismQuestStatus],
          existsInPrism: true,
          questionnaire: employee.prismAssessment.questionnaire,
          lastFetchedAt: new Date(),
        };

        return sendResponse(res, 200, 'Assessment status retrieved', response);
      }
    }

    // No questionnaire data exists, fetch full history
    const history = await prismService.fetchCandidateHistory(employeeId);
    const firstItem = history.HistoryList?.[0];

    if (!firstItem) {
      // No history found
      return sendResponse(res, 200, 'No assessment history', {
        questStatus: 1,
        questStatusLabel: QUEST_STATUS_LABELS[1],
        existsInPrism: false,
        lastFetchedAt: new Date(),
      });
    }

    const updateData: any = {
      prismAssessment: {
        externalIdent: employeeId,
        questStatus: firstItem.QuestStatus,
        lastFetchedAt: new Date(),
      },
    };

    // Only set questionnaire if we have QuestId/RandomCode from history
    if (firstItem.QuestId || firstItem.RandomCode) {
      updateData.prismAssessment.questionnaire = {
        qTypeId: firstItem.QTypeId || env.PRISM_DEFAULT_QTYPE_ID,
        questId: firstItem.QuestId || firstItem.RandomCode || '',
        randomCode: firstItem.RandomCode || '',
        actionUrl: '', // FetchCandidateHistory doesn't return ActionURLs
      };
    }

    await userRepository.update(employeeId, updateData);

    const response: IAssessmentStatusResponse = {
      questStatus: firstItem.QuestStatus,
      questStatusLabel: QUEST_STATUS_LABELS[firstItem.QuestStatus as PrismQuestStatus],
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
  
  console.log('🔍 getMyAssessments called for employeeId:', employeeId);
  console.log('🔍 requester:', { userId: requester.userId, _id: requester._id, role: requester.role });
  
  if (!employeeId) {
    throw new ApiError(400, 'Employee ID not found in token');
  }

  const assessments: IMyAssessmentItem[] = [];

  try {
    // Simply get employee data from MongoDB
    const employee = await userRepository.findById(employeeId);
    
    console.log('🔍 Employee found:', {
      _id: employee?._id,
      email: employee?.email,
      hasPrismAssessment: !!employee?.prismAssessment,
      hasQuestionnaire: !!employee?.prismAssessment?.questionnaire,
      hasActionUrl: !!employee?.prismAssessment?.questionnaire?.actionUrl,
      actionUrl: employee?.prismAssessment?.questionnaire?.actionUrl,
      questStatus: employee?.prismAssessment?.questStatus,
    });
    
    // Show the assessment only when the assigned questionnaire has a URL.
    if (employee?.prismAssessment?.questionnaire?.actionUrl) {
      const questionnaire = employee.prismAssessment.questionnaire;
      const questStatus = employee.prismAssessment.questStatus || 1;
      const lastFetchedAt = employee.prismAssessment.lastFetchedAt
        ? new Date(employee.prismAssessment.lastFetchedAt)
        : undefined;
      const assessment = {
        entityType: 'PRISM Brain Mapping Assessment',
        qTypeId: questionnaire?.qTypeId || env.PRISM_DEFAULT_QTYPE_ID,
        isCompleted: questStatus >= 3,
        isPaidFor: questStatus === 6,
        dateSent: lastFetchedAt?.toISOString() || (employee.createdAt ? new Date(employee.createdAt).toISOString() : new Date().toISOString()),
        dateCompleted: questStatus >= 3 && lastFetchedAt ? lastFetchedAt.toISOString() : null,
        takeAssessmentUrl: questionnaire?.actionUrl || '',
        questStatus,
        questStatusLabel: QUEST_STATUS_LABELS[questStatus as PrismQuestStatus] || 'Ready to Take',
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
  const entityTypeId = parseInt(req.query.entityTypeId as string) || 1;
  const onetCode = req.query.onetCode as string;

  if (!employeeId || Array.isArray(employeeId)) throw new ApiError(400, 'Invalid Employee ID');

  const employee = await userRepository.findById(employeeId);
  if (!employee) throw new ApiError(404, 'Employee not found');

  if (!canAccessEmployeeAssessment(requester, employeeId, employee.organisationId || employee.tenantId || '')) {
    throw new ApiError(403, 'You do not have permission to view this report');
  }

  if (!employee.prismAssessment) throw new ApiError(404, 'Assessment not found');

  if (employee.prismAssessment.questStatus !== 6) {
    throw new ApiError(400, 'Report is not unlocked. Please unlock the report first (status must be "paid").');
  }

  if (employee.prismAssessment.report?.reportData) {
    const response: IAssessmentReportResponse = {
      questStatus: employee.prismAssessment.questStatus,
      questStatusLabel: QUEST_STATUS_LABELS[employee.prismAssessment.questStatus as PrismQuestStatus],
      reportData: employee.prismAssessment.report.reportData,
      basicMapUrl: employee.prismAssessment.report.basicMapUrl,
      fullMapUrl: employee.prismAssessment.report.fullMapUrl,
      unlockedAt: employee.prismAssessment.report.unlockedAt,
    };
    return sendResponse(res, 200, 'Assessment report retrieved (cached)', response);
  }

  try {
    const reportData = await prismService.fetchMergedReportData(employeeId, entityTypeId, onetCode);
    const basicMapUrl = await prismService.fetchBasicMap(employeeId);
    const fullMapUrl = await prismService.fetchFullMap(employeeId);

    await userRepository.update(employeeId, {
      prismAssessment: {
        ...employee.prismAssessment,
        report: {
          reportData,
          basicMapUrl,
          fullMapUrl,
          unlockedAt: employee.prismAssessment.report?.unlockedAt || new Date(),
        },
      },
    } as any);

    const response: IAssessmentReportResponse = {
      questStatus: employee.prismAssessment.questStatus,
      questStatusLabel: QUEST_STATUS_LABELS[employee.prismAssessment.questStatus as PrismQuestStatus],
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
      mapUrl = employee.prismAssessment.report?.fullMapUrl || (await prismService.fetchFullMap(employeeId));
    } else {
      mapUrl = employee.prismAssessment.report?.basicMapUrl || (await prismService.fetchBasicMap(employeeId));
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

  const organisationId = employee.organisationId || employee.tenantId || '';
  if (!organisationId) throw new ApiError(400, 'Employee must belong to an organisation');

  try {
    await prismService.unlockReport(employeeId, organisationId);

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

  const assessments = employees.map((employee) => ({
    employeeId: employee._id,
    fullName: employee.fullName,
    email: employee.email,
    department: employee.department,
    title: employee.title,
    profileImage: employee.profileImage,
    assessment: employee.prismAssessment
      ? {
          questStatus: employee.prismAssessment.questStatus,
          questStatusLabel: QUEST_STATUS_LABELS[employee.prismAssessment.questStatus as PrismQuestStatus],
          lastFetchedAt: employee.prismAssessment.lastFetchedAt,
          hasQuestionnaire: !!employee.prismAssessment.questionnaire?.questId,
          isUnlocked: employee.prismAssessment.questStatus === 6,
        }
      : null,
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
