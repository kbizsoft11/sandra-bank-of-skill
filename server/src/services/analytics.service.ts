import { Types } from 'mongoose';
import { SkillCategory } from '../models/skillCategory.model';
import { Skill } from '../models/skill.model';
import { SkillUser } from '../models/skillUser.model';
import { UserModel } from '../models/user.model';

/**
 * Get skill category analytics
 */
export const getSkillCategoryAnalytics = async (startDate?: Date, endDate?: Date) => {
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

    // 1. Total Skills per Category
    const totalSkillsPerCategory = await Skill.aggregate([
      {
        $match: { archived: false }
      },
      {
        $lookup: {
          from: 'skillcategories',
          localField: 'categoryId',
          foreignField: '_id',
          as: 'category',
        },
      },
      {
        $unwind: {
          path: '$category',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          'category._id': { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$category._id',
          categoryName: { $first: '$category.name' },
          skillCount: { $sum: 1 },
        },
      },
      {
        $sort: { skillCount: -1 },
      },
    ]);

    // 2. Total Employees Using Skills per Category
    const employeesPerCategory = await SkillUser.aggregate([
      {
        $match: dateMatch
      },
      {
        $lookup: {
          from: 'skills',
          localField: 'skillId',
          foreignField: '_id',
          as: 'skill',
        },
      },
      {
        $unwind: '$skill',
      },
      {
        $lookup: {
          from: 'skillcategories',
          localField: 'skill.categoryId',
          foreignField: '_id',
          as: 'category',
        },
      },
      {
        $unwind: {
          path: '$category',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          'skill.archived': false,
          'category._id': { $exists: true, $ne: null }
        },
      },
      {
        $group: {
          _id: '$category._id',
          categoryName: { $first: '$category.name' },
          employeeCount: { $addToSet: '$userId' },
          assignmentCount: { $sum: 1 },
        },
      },
      {
        $addFields: {
          employeeCount: { $size: '$employeeCount' },
        },
      },
      {
        $sort: { employeeCount: -1 },
      },
    ]);

    // Get total employees for popularity calculation
    const totalEmployees = await UserModel.countDocuments({ role: 'employee' });

    // 3. Most Popular Categories (by employee count)
    const mostPopularCategories = employeesPerCategory.slice(0, 10).map((cat) => ({
      categoryId: cat._id,
      categoryName: cat.categoryName,
      employeeCount: cat.employeeCount,
      assignmentCount: cat.assignmentCount,
      popularity: Math.round((cat.employeeCount / (totalEmployees || 1)) * 100),
    }));

    // 4. Category Usage Reports (detailed breakdown)
    const categoryUsageReports = await Promise.all(
      totalSkillsPerCategory.map(async (category) => {
        const employees = employeesPerCategory.find(
          (emp) => emp._id && category._id && emp._id.toString() === category._id.toString()
        );

        // Get average skill score for this category
        const averageScore = await SkillUser.aggregate([
          {
            $match: dateMatch
          },
          {
            $lookup: {
              from: 'skills',
              localField: 'skillId',
              foreignField: '_id',
              as: 'skill',
            },
          },
          {
            $unwind: '$skill',
          },
          {
            $match: {
              'skill.categoryId': category._id ? new Types.ObjectId(category._id.toString()) : null,
              'skill.archived': false,
            },
          },
          {
            $group: {
              _id: null,
              avgScore: { $avg: '$score' },
              totalAssignments: { $sum: 1 },
              experts: {
                $sum: {
                  $cond: [{ $eq: ['$level', 'expert'] }, 1, 0],
                },
              },
              advanced: {
                $sum: {
                  $cond: [{ $eq: ['$level', 'advanced'] }, 1, 0],
                },
              },
              intermediate: {
                $sum: {
                  $cond: [{ $eq: ['$level', 'intermediate'] }, 1, 0],
                },
              },
              beginner: {
                $sum: {
                  $cond: [{ $eq: ['$level', 'beginner'] }, 1, 0],
                },
              },
            },
          },
        ]);

        const totalEmployees = await UserModel.countDocuments({ role: 'employee' });

        return {
          categoryId: category._id,
          categoryName: category.categoryName,
          totalSkills: category.skillCount,
          totalEmployeesUsing: employees?.employeeCount || 0,
          totalAssignments: employees?.assignmentCount || 0,
          averageScore: averageScore[0]?.avgScore ? Math.round(averageScore[0].avgScore) : 0,
          levelBreakdown: {
            expert: averageScore[0]?.experts || 0,
            advanced: averageScore[0]?.advanced || 0,
            intermediate: averageScore[0]?.intermediate || 0,
            beginner: averageScore[0]?.beginner || 0,
          },
          adoptionRate: employees?.employeeCount
            ? Math.round(((employees.employeeCount / totalEmployees) || 1) * 100)
            : 0,
        };
      })
    );

    // 5. Category Growth (trend analysis)
    const categoryGrowth = await SkillUser.aggregate([
      {
        $match: dateMatch
      },
      {
        $lookup: {
          from: 'skills',
          localField: 'skillId',
          foreignField: '_id',
          as: 'skill',
        },
      },
      {
        $unwind: '$skill',
      },
      {
        $lookup: {
          from: 'skillcategories',
          localField: 'skill.categoryId',
          foreignField: '_id',
          as: 'category',
        },
      },
      {
        $unwind: {
          path: '$category',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          'skill.archived': false,
          'category._id': { $exists: true, $ne: null }
        },
      },
      {
        $group: {
          _id: {
            category: '$category._id',
            categoryName: '$category.name',
            month: { $month: '$createdAt' },
            year: { $year: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.year': -1, '_id.month': -1 },
      },
      {
        $limit: 100,
      },
    ]);

    // Calculate total employees with skills
    const totalEmployeesWithSkills = employeesPerCategory.reduce((max, cat) => Math.max(max, cat.employeeCount), 0);

    return {
      totalSkillsPerCategory,
      employeesPerCategory,
      mostPopularCategories,
      categoryUsageReports,
      categoryGrowth,
      summary: {
        totalCategories: totalSkillsPerCategory.length,
        totalSkills: totalSkillsPerCategory.reduce((sum, cat) => sum + cat.skillCount, 0),
        totalEmployeesWithSkills,
        averageEmployeesPerCategory: Math.round(
          employeesPerCategory.reduce((sum, cat) => sum + cat.employeeCount, 0) /
            (totalSkillsPerCategory.length || 1)
        ),
      },
    };
  } catch (error) {
    console.error('Error getting skill category analytics:', error);
    throw error;
  }
};

/**
 * Get skill analytics
 */
export const getSkillAnalytics = async (startDate?: Date, endDate?: Date) => {
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

    const totalEmployees = await UserModel.countDocuments({ role: 'employee' });

    // Get ALL skills in the system (not archived)
    const allSkills = await Skill.find({ archived: false }).lean();
    const totalSkillsCount = allSkills.length;

    // 1. Skills with Employee Assignments
    const skillsWithAssignments = await SkillUser.aggregate([
      {
        $match: dateMatch
      },
      {
        $lookup: {
          from: 'skills',
          localField: 'skillId',
          foreignField: '_id',
          as: 'skill',
        },
      },
      {
        $unwind: '$skill',
      },
      {
        $match: {
          'skill.archived': false,
        },
      },
      {
        $group: {
          _id: '$skill._id',
          skillName: { $first: '$skill.name' },
          categoryId: { $first: '$skill.categoryId' },
          employeeCount: { $addToSet: '$userId' },
          assignmentCount: { $sum: 1 },
        },
      },
      {
        $addFields: {
          employeeCount: { $size: '$employeeCount' },
        },
      },
      {
        $sort: { employeeCount: -1 },
      },
    ]);

    // 2. Average Skill Level for skills with assignments
    const averageSkillLevel = await SkillUser.aggregate([
      {
        $match: dateMatch
      },
      {
        $lookup: {
          from: 'skills',
          localField: 'skillId',
          foreignField: '_id',
          as: 'skill',
        },
      },
      {
        $unwind: '$skill',
      },
      {
        $match: {
          'skill.archived': false,
        },
      },
      {
        $group: {
          _id: '$skill._id',
          skillName: { $first: '$skill.name' },
          categoryId: { $first: '$skill.categoryId' },
          avgScore: { $avg: '$score' },
          avgLevel: { $push: '$level' },
          totalAssignments: { $sum: 1 },
          experts: {
            $sum: {
              $cond: [{ $eq: ['$level', 'expert'] }, 1, 0],
            },
          },
          advanced: {
            $sum: {
              $cond: [{ $eq: ['$level', 'advanced'] }, 1, 0],
            },
          },
          intermediate: {
            $sum: {
              $cond: [{ $eq: ['$level', 'intermediate'] }, 1, 0],
            },
          },
          beginner: {
            $sum: {
              $cond: [{ $eq: ['$level', 'beginner'] }, 1, 0],
            },
          },
        },
      },
      {
        $sort: { avgScore: -1 },
      },
    ]);

    // 3. Most Requested Skills (by assignment count)
    const mostRequestedSkills = skillsWithAssignments.slice(0, 10).map((skill) => {
      const avgData = averageSkillLevel.find((s) => s._id.toString() === skill._id.toString());
      return {
        skillId: skill._id,
        skillName: skill.skillName,
        categoryId: skill.categoryId,
        employeeCount: skill.employeeCount,
        assignmentCount: skill.assignmentCount,
        averageScore: avgData?.avgScore ? Math.round(avgData.avgScore) : 0,
      };
    });

    // 4. Most Popular Skills (by employee adoption)
    const mostPopularSkills = skillsWithAssignments
      .slice(0, 10)
      .map((skill) => ({
        skillId: skill._id,
        skillName: skill.skillName,
        categoryId: skill.categoryId,
        employeeCount: skill.employeeCount,
        adoptionRate: Math.round((skill.employeeCount / (totalEmployees || 1)) * 100),
      }));

    // 5. Skill Growth Trend
    const skillGrowthTrend = await SkillUser.aggregate([
      {
        $match: dateMatch
      },
      {
        $lookup: {
          from: 'skills',
          localField: 'skillId',
          foreignField: '_id',
          as: 'skill',
        },
      },
      {
        $unwind: '$skill',
      },
      {
        $match: {
          'skill.archived': false,
        },
      },
      {
        $group: {
          _id: {
            skillId: '$skill._id',
            skillName: '$skill.name',
            month: { $month: '$createdAt' },
            year: { $year: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.year': -1, '_id.month': -1 },
      },
      {
        $limit: 100,
      },
    ]);

    // 6. Skill Gap Analysis - Skills with low adoption/usage or no assignments
    const skillGapAnalysis = [];
    
    // Add skills with low scores
    skillGapAnalysis.push(
      ...averageSkillLevel
        .filter((skill) => skill.avgScore < 50)
        .slice(0, 5)
        .map((skill) => {
          const employeeData = skillsWithAssignments.find(
            (s) => s._id.toString() === skill._id.toString()
          );
          return {
            skillId: skill._id,
            skillName: skill.skillName,
            categoryId: skill.categoryId,
            averageScore: Math.round(skill.avgScore),
            employeeCount: employeeData?.employeeCount || 0,
            totalAssignments: skill.totalAssignments,
            levelBreakdown: {
              expert: skill.experts,
              advanced: skill.advanced,
              intermediate: skill.intermediate,
              beginner: skill.beginner,
            },
            recommendations: skill.avgScore < 30 ? 'High Priority - Training Required' : 'Medium Priority - Skill Development Needed',
            gapReason: 'Low Performance Score',
          };
        })
    );

    // Add skills with NO assignments (unassigned skills)
    const assignedSkillIds = new Set(skillsWithAssignments.map(s => s._id.toString()));
    const unassignedSkills = allSkills.filter(skill => !assignedSkillIds.has(skill._id.toString())).slice(0, 5);
    
    skillGapAnalysis.push(
      ...unassignedSkills.map((skill) => ({
        skillId: skill._id,
        skillName: skill.name,
        categoryId: skill.categoryId,
        averageScore: 0,
        employeeCount: 0,
        totalAssignments: 0,
        levelBreakdown: {
          expert: 0,
          advanced: 0,
          intermediate: 0,
          beginner: 0,
        },
        recommendations: 'Critical - No Employees Assigned',
        gapReason: 'Skill Not Yet Assigned to Any Employee',
      }))
    );

    // 7. Detailed Skill Reports (only for skills with assignments)
    const skillReports = await Promise.all(
      averageSkillLevel.map(async (skill) => {
        const employeeData = skillsWithAssignments.find(
          (s) => s._id.toString() === skill._id.toString()
        );

        // Get category name
        const category = await SkillCategory.findById(skill.categoryId);

        return {
          skillId: skill._id,
          skillName: skill.skillName,
          categoryName: category?.name || 'Unknown',
          categoryId: skill.categoryId,
          totalEmployeesWithSkill: employeeData?.employeeCount || 0,
          totalAssignments: skill.totalAssignments,
          averageScore: Math.round(skill.avgScore),
          adoptionRate: Math.round(
            ((employeeData?.employeeCount || 0) / (totalEmployees || 1)) * 100
          ),
          levelBreakdown: {
            expert: skill.experts,
            advanced: skill.advanced,
            intermediate: skill.intermediate,
            beginner: skill.beginner,
          },
        };
      })
    );

    // Count skills with assignments
    const skillsWithAssignmentsCount = skillsWithAssignments.length;

    return {
      skillEmployeeCount: skillsWithAssignments,
      averageSkillLevel,
      mostRequestedSkills,
      mostPopularSkills,
      skillGrowthTrend,
      skillGapAnalysis,
      skillReports,
      summary: {
        totalSkills: totalSkillsCount,
        skillsWithAssignments: skillsWithAssignmentsCount,
        skillsWithoutAssignments: totalSkillsCount - skillsWithAssignmentsCount,
        totalEmployeesWithAnySkill: new Set(
          skillsWithAssignments.flatMap((s) => s.employeeCount || [])
        ).size,
        averageSkillsPerEmployee: Math.round(
          skillsWithAssignments.reduce((sum, s) => sum + s.assignmentCount, 0) /
            (totalEmployees || 1)
        ),
        highestScoredSkill: averageSkillLevel[0] ? {
          skillName: averageSkillLevel[0].skillName,
          score: Math.round(averageSkillLevel[0].avgScore),
        } : null,
        lowestScoredSkill: averageSkillLevel[averageSkillLevel.length - 1] ? {
          skillName: averageSkillLevel[averageSkillLevel.length - 1].skillName,
          score: Math.round(averageSkillLevel[averageSkillLevel.length - 1].avgScore),
        } : null,
      },
    };
  } catch (error) {
    console.error('Error getting skill analytics:', error);
    throw error;
  }
};
