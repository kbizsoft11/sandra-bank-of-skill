import { Organisation } from '../models/organisation.model';
import { UserModel } from '../models/user.model';

/**
 * Get employee analytics with optional date filtering
 */
export const getEmployeeAnalytics = async (startDate?: Date, endDate?: Date) => {
  try {
    // 1. Total Employees
    const totalEmployees = await UserModel.countDocuments({ role: 'employee' });

    // 2. Active Employees
    const activeEmployees = await UserModel.countDocuments({ 
      role: 'employee',
      status: { $ne: false }
    });

    // 3. Inactive Employees
    const inactiveEmployees = await UserModel.countDocuments({ 
      role: 'employee',
      status: false 
    });

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

    // 4. Employees by Company
    const employeesByCompany = await UserModel.aggregate([
      {
        $match: { role: 'employee', ...dateMatch }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'tenantId',
          foreignField: 'tenantId',
          as: 'companyUser',
        },
      },
      {
        $unwind: {
          path: '$companyUser',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          'companyUser.role': 'company',
        },
      },
      {
        $lookup: {
          from: 'organisations',
          let: { ownerUserId: '$companyUser._id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: [{ $toString: '$ownerUserId' }, { $toString: '$$ownerUserId' }]
                }
              }
            }
          ],
          as: 'organisationInfo',
        },
      },
      {
        $unwind: {
          path: '$organisationInfo',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: '$tenantId',
          companyName: { $first: { $ifNull: ['$organisationInfo.organisationName', 'Unknown'] } },
          totalCount: { $sum: 1 },
          activeCount: {
            $sum: {
              $cond: [{ $ne: ['$status', false] }, 1, 0],
            },
          },
          inactiveCount: {
            $sum: {
              $cond: [{ $eq: ['$status', false] }, 1, 0],
            },
          },
        },
      },
      {
        $sort: { totalCount: -1 },
      },
    ]);

    // 5. Department-wise Employees
    const departmentWiseEmployees = await UserModel.aggregate([
      {
        $match: { role: 'employee', ...dateMatch }
      },
      {
        $group: {
          _id: { $ifNull: ['$department', 'No Department'] },
          totalEmployees: { $sum: 1 },
          activeEmployees: {
            $sum: {
              $cond: [{ $ne: ['$status', false] }, 1, 0],
            },
          },
          inactiveEmployees: {
            $sum: {
              $cond: [{ $eq: ['$status', false] }, 1, 0],
            },
          },
        },
      },
      {
        $sort: { totalEmployees: -1 },
      },
    ]);

    // 6. Employee Growth Report (registrations by month)
    const employeeGrowthReport = await UserModel.aggregate([
      {
        $match: { role: 'employee', ...dateMatch }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.year': -1, '_id.month': -1 },
      },
      {
        $limit: 12, // Last 12 months
      },
    ]);

    // 7. Employee Activity Report (by company)
    const employeeActivityReport = await UserModel.aggregate([
      {
        $match: { role: 'employee', ...dateMatch }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'tenantId',
          foreignField: 'tenantId',
          as: 'companyUser',
        },
      },
      {
        $unwind: {
          path: '$companyUser',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          'companyUser.role': 'company',
        },
      },
      {
        $lookup: {
          from: 'organisations',
          let: { ownerUserId: '$companyUser._id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: [{ $toString: '$ownerUserId' }, { $toString: '$$ownerUserId' }]
                }
              }
            }
          ],
          as: 'organisationInfo',
        },
      },
      {
        $unwind: {
          path: '$organisationInfo',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: '$tenantId',
          companyName: { $first: { $ifNull: ['$organisationInfo.organisationName', 'Unknown'] } },
          totalEmployees: { $sum: 1 },
          activeEmployees: {
            $sum: {
              $cond: [{ $ne: ['$status', false] }, 1, 0],
            },
          },
          inactiveEmployees: {
            $sum: {
              $cond: [{ $eq: ['$status', false] }, 1, 0],
            },
          },
          avgDaysActive: {
            $avg: {
              $floor: {
                $divide: [
                  { $subtract: [new Date(), '$createdAt'] },
                  86400000, // milliseconds in a day
                ],
              },
            },
          },
        },
      },
      {
        $sort: { totalEmployees: -1 },
      },
    ]);

    // 8. Top Departments
    const topDepartments = departmentWiseEmployees.slice(0, 10);

    // 9. New Employees (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const newEmployeesLast30Days = await UserModel.countDocuments({ 
      role: 'employee',
      createdAt: { $gte: thirtyDaysAgo }
    });

    // 10. Summary statistics
    const summary = {
      totalEmployees,
      activeEmployees,
      inactiveEmployees,
      activePercentage: Math.round((activeEmployees / (totalEmployees || 1)) * 100),
      inactivePercentage: Math.round((inactiveEmployees / (totalEmployees || 1)) * 100),
      newEmployeesLast30Days,
      totalCompanies: employeesByCompany.length,
      departmentCount: topDepartments.length,
      averageEmployeesPerCompany: employeesByCompany.length > 0 
        ? Math.round(totalEmployees / employeesByCompany.length) 
        : 0,
    };

    return {
      summary,
      totalEmployees,
      activeEmployees,
      inactiveEmployees,
      employeesByCompany,
      departmentWiseEmployees,
      employeeGrowthReport,
      employeeActivityReport,
      topDepartments,
      newEmployeesLast30Days,
    };
  } catch (error) {
    console.error('Error getting employee analytics:', error);
    throw error;
  }
};
