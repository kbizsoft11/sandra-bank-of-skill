import { Organisation } from '../models/organisation.model';
import { UserModel } from '../models/user.model';
import { SkillUser } from '../models/skillUser.model';

/**
 * Get company analytics with optional date filtering
 */
export const getCompanyAnalytics = async (startDate?: Date, endDate?: Date) => {
  try {
    // Build date match filter if provided
    const dateMatch: any = {};
    if (startDate || endDate) {
      dateMatch.createdAt = {};
      if (startDate) dateMatch.createdAt.$gte = startDate;
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        dateMatch.createdAt.$lte = endOfDay;
      }
    }

    // Get all organisations (companies)
    const allCompanies = await Organisation.find(dateMatch).lean();
    
    // 1. Total Companies
    const totalCompanies = allCompanies.length;

    // 2. Active Companies (status = true or not false)
    const activeCompanies = await Organisation.countDocuments({ 
      status: { $ne: false },
      ...dateMatch
    });

    // 3. Inactive Companies
    const inactiveCompanies = await Organisation.countDocuments({ 
      status: false,
      ...dateMatch
    });

    // 4. New Company Registrations (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const newCompaniesQuery = { createdAt: { $gte: thirtyDaysAgo } };
    if (startDate || endDate) {
      Object.assign(newCompaniesQuery.createdAt, dateMatch.createdAt);
    }

    const newCompanies = await Organisation.countDocuments(newCompaniesQuery);

    // 5. Company Growth Report (registrations by month)
    const growthReport = await Organisation.aggregate([
      {
        $match: dateMatch
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
          companyNames: { $push: '$organisationName' },
        },
      },
      {
        $sort: { '_id.year': -1, '_id.month': -1 },
      },
      {
        $limit: 12, // Last 12 months
      },
    ]);

    // 6. Company Activity Report with employee counts
    const activityReport = await Organisation.aggregate([
      {
        $match: dateMatch
      },
      {
        $lookup: {
          from: 'users',
          let: { orgId: { $toString: '$_id' } },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$organisationId', '$$orgId']
                }
              }
            }
          ],
          as: 'employees',
        },
      },
      {
        $project: {
          _id: 1,
          name: '$organisationName',
          status: 1,
          createdAt: 1,
          employeeCount: { $size: '$employees' },
        },
      },
      {
        $sort: { employeeCount: -1 },
      },
    ]);

    // 7. Company Usage Report with skill assignments - Simplified aggregation
    const usageReport = await Organisation.aggregate([
      {
        $match: dateMatch
      },
      {
        $lookup: {
          from: 'users',
          let: { orgId: { $toString: '$_id' } },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$organisationId', '$$orgId']
                }
              }
            },
            {
              $lookup: {
                from: 'skillusers',
                localField: '_id',
                foreignField: 'userId',
                as: 'skills',
              },
            },
            {
              $project: {
                _id: 1,
                status: 1,
                skillCount: { $size: '$skills' },
              },
            },
          ],
          as: 'employeeData',
        },
      },
      {
        $project: {
          _id: 1,
          name: '$organisationName',
          status: 1,
          createdAt: 1,
          totalEmployees: { $size: '$employeeData' },
          activeEmployees: {
            $size: {
              $filter: {
                input: '$employeeData',
                as: 'emp',
                cond: { $ne: ['$$emp.status', false] },
              },
            },
          },
          totalSkillAssignments: {
            $sum: {
              $map: {
                input: '$employeeData',
                as: 'emp',
                in: '$$emp.skillCount',
              },
            },
          },
          registrationDate: '$createdAt',
          daysActive: {
            $floor: {
              $divide: [
                { $subtract: [new Date(), '$createdAt'] },
                86400000, // milliseconds in a day
              ],
            },
          },
        },
      },
      {
        $sort: { totalEmployees: -1 },
      },
    ]);

    // 8. Top skill categories used by companies - Simplified aggregation
    const topSkillCategories = await Organisation.aggregate([
      {
        $match: dateMatch
      },
      {
        $lookup: {
          from: 'users',
          let: { orgId: { $toString: '$_id' } },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$organisationId', '$$orgId']
                }
              }
            },
            {
              $lookup: {
                from: 'skillusers',
                localField: '_id',
                foreignField: 'userId',
                as: 'skillAssignments',
              },
            },
            {
              $unwind: '$skillAssignments',
            },
            {
              $lookup: {
                from: 'skills',
                localField: 'skillAssignments.skillId',
                foreignField: '_id',
                as: 'skillInfo',
              },
            },
            {
              $unwind: '$skillInfo',
            },
            {
              $lookup: {
                from: 'skillcategories',
                localField: 'skillInfo.categoryId',
                foreignField: '_id',
                as: 'categoryInfo',
              },
            },
            {
              $unwind: {
                path: '$categoryInfo',
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                categoryName: { $ifNull: ['$categoryInfo.name', 'Uncategorized'] },
              },
            },
          ],
          as: 'categoryMappings',
        },
      },
      {
        $unwind: {
          path: '$categoryMappings',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          'categoryMappings.categoryName': { $ne: null },
        },
      },
      {
        $group: {
          _id: '$categoryMappings.categoryName',
          companiesCount: { $sum: 1 },
        },
      },
      {
        $sort: { companiesCount: -1 },
      },
      {
        $limit: 10,
      },
      {
        $project: {
          _id: 0,
          categoryName: '$_id',
          companiesCount: '$companiesCount',
          usageCount: '$companiesCount',
        },
      },
    ]);

    // 9. Summary statistics
    const totalEmployees = await UserModel.countDocuments({ role: 'employee' });

    const summary = {
      totalCompanies,
      activeCompanies,
      inactiveCompanies,
      activePercentage: Math.round((activeCompanies / totalCompanies) * 100) || 0,
      inactivePercentage: Math.round((inactiveCompanies / totalCompanies) * 100) || 0,
      newCompaniesLast30Days: newCompanies,
      averageEmployeesPerCompany: Math.round(totalEmployees / (totalCompanies || 1)),
      totalEmployees,
      totalAdmins: 0, // Removed - no admins per company
    };

    // 10. Top companies by employee count
    const topCompanies = activityReport.slice(0, 10).map((company: any) => ({
      companyId: company._id,
      companyName: company.name,
      status: company.status === false ? 'Inactive' : 'Active',
      totalEmployees: company.employeeCount || 0,
      admins: 0, // Removed
      employees: company.employeeCount || 0,
    }));

    // 11. Recent company registrations
    const recentRegistrations = await Organisation.find(dateMatch)
      .sort({ createdAt: -1 })
      .limit(10)
      .lean()
      .then((companies: any) =>
        companies.map((company: any) => ({
          companyId: company._id,
          companyName: company.organisationName,
          status: company.status === false ? 'Inactive' : 'Active',
          registeredDate: company.createdAt,
        }))
      );

    return {
      summary,
      totalCompanies,
      activeCompanies,
      inactiveCompanies,
      newRegistrations: newCompanies,
      growthReport,
      activityReport,
      usageReport,
      topCompanies,
      recentRegistrations,
      topSkillCategories,
    };
  } catch (error) {
    console.error('Error getting company analytics:', error);
    throw error;
  }
};
