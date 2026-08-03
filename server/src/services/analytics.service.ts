import { Types } from 'mongoose';
import { SkillCategory } from '../models/skillCategory.model';
import { Skill } from '../models/skill.model';
import { SkillUser } from '../models/skillUser.model';
import { UserModel } from '../models/user.model';

/**
 * Get skill category analytics
 */
export const getSkillCategoryAnalytics = async () => {
  try {
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
          (emp) => emp._id.toString() === category._id.toString()
        );

        // Get average skill score for this category
        const averageScore = await SkillUser.aggregate([
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
              'skill.categoryId': new Types.ObjectId(category._id),
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
