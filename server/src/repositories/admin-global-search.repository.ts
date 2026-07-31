import { UserModel } from '../models/user.model';
import { Skill } from '../models/skill.model';
import { SkillCategory } from '../models/skillCategory.model';
import { QuestionnaireModel } from '../models/questionnaire.model';

/**
 * Get dashboard summary for current month
 */
export const getAdminDashboardSummary = async () => {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Total Companies
  const totalCompanies = await UserModel.countDocuments({ role: 'company' });

  // Total Employees
  const totalEmployees = await UserModel.countDocuments({ role: 'employee' });

  // Total Users (all roles)
  const totalUsers = await UserModel.countDocuments();

  // Total Skills
  const totalSkills = await Skill.countDocuments();

  // Total Skill Categories
  const totalCategories = await SkillCategory.countDocuments();

  // Total Questionnaires
  const totalQuestionnaires = await QuestionnaireModel.countDocuments();

  // Total Assessments (placeholder - based on questionnaire responses if available)
  const totalAssessments = 0;

  return {
    totalCompanies,
    totalEmployees,
    totalUsers,
    totalSkills,
    totalCategories,
    totalQuestionnaires,
    totalAssessments,
  };
};

/**
 * Search across companies and employees with advanced filtering
 */
export const globalSearch = async (params: {
  search?: string;
  entity?: 'all' | 'companies' | 'employees';
  status?: 'active' | 'inactive' | 'pending' | 'verified' | 'unverified';
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) => {
  const {
    search = '',
    entity = 'all',
    status,
    startDate,
    endDate,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = params;

  const skip = (page - 1) * limit;
  const searchRegex = { $regex: search, $options: 'i' };

  // Build date filter
  const dateFilter: any = {};
  if (startDate) {
    dateFilter.$gte = startDate;
  }
  if (endDate) {
    dateFilter.$lte = endDate;
  }

  const results: any = {};
  const counts: any = {};

  // Search Companies
  if (entity === 'all' || entity === 'companies') {
    const companyMatch: any = { role: 'company' };

    if (search) {
      companyMatch.$or = [
        { fullName: searchRegex },
        { email: searchRegex },
      ];
    }

    if (status) {
      if (status === 'active') {
        companyMatch.isActive = true;
      } else if (status === 'inactive') {
        companyMatch.isActive = false;
      }
    }

    if (Object.keys(dateFilter).length > 0) {
      companyMatch.createdAt = dateFilter;
    }

    counts.companies = await UserModel.countDocuments(companyMatch);

    results.companies = await UserModel.find(companyMatch)
      .select('fullName email tenantId createdAt isActive accountStatus')
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  }

  // Search Employees
  if (entity === 'all' || entity === 'employees') {
    const employeeMatch: any = { role: 'employee' };

    if (search) {
      employeeMatch.$or = [
        { fullName: searchRegex },
        { email: searchRegex },
        { department: searchRegex },
      ];
    }

    if (status) {
      if (status === 'active') {
        employeeMatch.isActive = true;
      } else if (status === 'inactive') {
        employeeMatch.isActive = false;
      } else if (status === 'pending') {
        employeeMatch.accountStatus = 'invited';
      }
    }

    if (Object.keys(dateFilter).length > 0) {
      employeeMatch.createdAt = dateFilter;
    }

    counts.employees = await UserModel.countDocuments(employeeMatch);

    const employees = await UserModel.aggregate([
      { $match: employeeMatch },
      {
        $lookup: {
          from: 'organisations',
          localField: 'organisationId',
          foreignField: '_id',
          as: 'organisation',
        },
      },
      {
        $unwind: {
          path: '$organisation',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'skillusers',
          localField: '_id',
          foreignField: 'userId',
          as: 'skillUsers',
        },
      },
      {
        $lookup: {
          from: 'skills',
          localField: 'skillUsers.skillId',
          foreignField: '_id',
          as: 'skills',
        },
      },
      {
        $addFields: {
          skills: {
            $filter: {
              input: '$skills',
              as: 'skill',
              cond: { $eq: ['$$skill.archived', false] }
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          fullName: 1,
          email: 1,
          department: 1,
          'organisation.organisationName': 1,
          skillCount: { $size: '$skills' },
          isActive: 1,
          accountStatus: 1,
          createdAt: 1,
        },
      },
      {
        $sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 },
      },
      { $skip: skip },
      { $limit: limit },
    ]);

    results.employees = employees;
  }

  // Calculate total for pagination
  const totalKey = entity === 'all' ? Object.keys(counts).reduce((a, b) => (counts[a] || 0) + (counts[b] || 0), 0) : counts[entity] || 0;
  const totalPages = Math.ceil(totalKey / limit);

  return {
    results,
    pagination: {
      page,
      limit,
      total: totalKey,
      totalPages,
      counts,
    },
  };
};
