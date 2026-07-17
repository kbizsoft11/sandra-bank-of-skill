import { Request, Response } from 'express';
import { UserModel } from '../models/user.model';
import { Skill } from '../models/skill.model';
import { SkillCategory } from '../models/skillCategory.model';
import { QuestionnaireModel } from '../models/questionnaire.model';

/**
 * Get admin dashboard statistics
 * Shows platform-wide statistics
 */
export const getAdminStats = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!userId || userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Get counts
    const totalUsers = await UserModel.countDocuments();
    const totalCompanies = await UserModel.countDocuments({ role: 'company' });
    const totalEmployees = await UserModel.countDocuments({ role: 'employee' });
    const totalSkills = await Skill.countDocuments();
    const totalCategories = await SkillCategory.countDocuments();
    const totalQuestionnaires = await QuestionnaireModel.countDocuments();

    // Get active users count (logged in within last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activeUsers = await UserModel.countDocuments({
      lastLoginAt: { $gte: thirtyDaysAgo },
    });

    // Get recent users
    const recentUsers = await UserModel.find()
      .select('fullName email role createdAt')
      .sort({ createdAt: -1 })
      .limit(5);

    // Get skills by category distribution
    const skillsByCategory = await Skill.aggregate([
      {
        $lookup: {
          from: 'skillcategories',
          localField: 'cat_id',
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
          _id: '$category.cat_name',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: 10,
      },
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalCompanies,
        totalEmployees,
        totalSkills,
        totalCategories,
        totalQuestionnaires,
        activeUsers,
        recentUsers,
        skillsByCategory,
      },
    });
  } catch (error: any) {
    console.error('Error fetching admin stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message,
    });
  }
};

/**
 * Get company dashboard statistics
 * Shows company-specific statistics
 */
export const getCompanyStats = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const organisationId = req.user?.organisationId;

    if (!userId || userRole !== 'company') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Get company's employees
    const totalEmployees = await UserModel.countDocuments({
      organisationId,
      role: 'employee',
    });

    // Get active employees (logged in within last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activeEmployees = await UserModel.countDocuments({
      organisationId,
      role: 'employee',
      lastLoginAt: { $gte: thirtyDaysAgo },
    });

    // Get company's questionnaires
    const totalQuestionnaires = await QuestionnaireModel.countDocuments({
      organisationId,
    });

    // Get skills count for company employees
    const employeeIds = await UserModel.find({
      organisationId,
      role: 'employee',
    }).distinct('_id');

    const totalSkills = await Skill.countDocuments({
      user_id: { $in: employeeIds as any },
    });

    // Get recent employees
    const recentEmployees = await UserModel.find({
      organisationId,
      role: 'employee',
    })
      .select('fullName email accountStatus createdAt')
      .sort({ createdAt: -1 })
      .limit(5);

    // Get invited employees
    const invitedEmployees = await UserModel.countDocuments({
      organisationId,
      role: 'employee',
      accountStatus: 'invited' as any,
    });

    // Get top employees by skill count
    const topEmployees = await Skill.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'user_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: '$user',
      },
      {
        $match: {
          'user.organisationId': organisationId,
          'user.role': 'employee',
        },
      },
      {
        $group: {
          _id: '$user_id',
          fullName: { $first: '$user.fullName' },
          department: { $first: '$user.department' },
          location: { $first: '$user.location' },
          skillCount: { $sum: 1 },
        },
      },
      {
        $sort: { skillCount: -1 },
      },
      {
        $limit: 10,
      },
      {
        $project: {
          _id: 1,
          fullName: 1,
          department: 1,
          location: 1,
          skillCount: 1,
        },
      },
    ]);

    // Get top skills by employee count
    const topSkills = await Skill.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'user_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: '$user',
      },
      {
        $match: {
          'user.organisationId': organisationId,
          'user.role': 'employee',
        },
      },
      {
        $group: {
          _id: '$skill_name',
          employeeCount: { $sum: 1 },
        },
      },
      {
        $sort: { employeeCount: -1 },
      },
      {
        $limit: 10,
      },
      {
        $project: {
          skillName: '$_id',
          employeeCount: 1,
          _id: 0,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalEmployees,
        activeEmployees,
        totalQuestionnaires,
        totalSkills,
        invitedEmployees,
        recentEmployees,
        topEmployees,
        topSkills,
      },
    });
  } catch (error: any) {
    console.error('Error fetching company stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message,
    });
  }
};

/**
 * Get employee dashboard statistics
 * Shows employee-specific statistics
 */
export const getEmployeeStats = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!userId || userRole !== 'employee') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Get employee's skills count
    const totalSkills = await Skill.countDocuments({ user_id: userId });

    // Get skills by category for this employee
    const skillsByCategory = await Skill.aggregate([
      {
        $match: { user_id: userId },
      },
      {
        $lookup: {
          from: 'skillcategories',
          localField: 'cat_id',
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
          _id: '$category.cat_name',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    // Get recent skills
    const recentSkills = await Skill.find({ user_id: userId })
      .select('skill_name skill_level created_at')
      .sort({ created_at: -1 })
      .limit(5);

    // Get assigned questionnaires count
    // Note: This requires questionnaire-response model which might not exist yet
    // For now, we'll return 0 and implement this when questionnaire responses are reviewed
    const assignedQuestionnaires = 0;
    const completedQuestionnaires = 0;

    return res.status(200).json({
      success: true,
      data: {
        totalSkills,
        skillsByCategory,
        recentSkills,
        assignedQuestionnaires,
        completedQuestionnaires,
      },
    });
  } catch (error: any) {
    console.error('Error fetching employee stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message,
    });
  }
};
