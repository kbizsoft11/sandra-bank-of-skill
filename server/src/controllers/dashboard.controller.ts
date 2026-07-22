import { Request, Response } from 'express';
import { UserModel } from '../models/user.model';
import { Skill } from '../models/skill.model';
import { SkillCategory } from '../models/skillCategory.model';
import { QuestionnaireModel } from '../models/questionnaire.model';
import { RoleModel } from '../models/role.model';

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
    const organisationId = req.user?.organisationId;

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
    const neverCompleted = 0;

    // Calculate average skill level (1-5 scale)
    const skillLevels = await Skill.aggregate([
      {
        $match: { user_id: userId },
      },
      {
        $group: {
          _id: null,
          averageLevel: { $avg: '$skill_level' },
        },
      },
    ]);
    const averageSkillLevel = skillLevels.length > 0 ? skillLevels[0].averageLevel : 3.05;

    // Calculate average interest level (1-5 scale)
    const interestLevels = await Skill.aggregate([
      {
        $match: { user_id: userId },
      },
      {
        $group: {
          _id: null,
          averageInterest: { $avg: '$interest_level' },
        },
      },
    ]);
    const averageInterestLevel = interestLevels.length > 0 ? interestLevels[0].averageInterest : 2.90;

    // Calculate skill points (sum of all skill levels)
    const skillPointsData = await Skill.aggregate([
      {
        $match: { user_id: userId },
      },
      {
        $group: {
          _id: null,
          totalPoints: { $sum: '$skill_level' },
        },
      },
    ]);
    const skillPoints = skillPointsData.length > 0 ? skillPointsData[0].totalPoints : 186;

    // Get top skill categories with level distribution
    const topCategories = await Skill.aggregate([
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
          averageLevel: { $avg: '$skill_level' },
          levels: {
            $push: '$skill_level',
          },
        },
      },
      {
        $project: {
          _id: 1,
          count: 1,
          averageLevel: 1,
          levels: {
            $arrayToObject: {
              $map: {
                input: '$levels',
                as: 'level',
                in: {
                  k: { $toString: '$$level' },
                  v: 1,
                },
              },
            },
          },
        },
      },
      {
        $sort: { averageLevel: -1 },
      },
      {
        $limit: 3,
      },
    ]);

    // Get top skills by skill level
    const topSkills = await Skill.find({ user_id: userId })
      .select('skill_name skill_level')
      .sort({ skill_level: -1, skill_name: 1 })
      .limit(10)
      .then((skills) =>
        skills.map((skill) => ({
          _id: skill._id,
          skillName: skill.skill_name,
          skillLevel: skill.skill_level,
        }))
      );

    // Get top interests (skills with highest interest level)
    const topInterests = await Skill.find({ user_id: userId })
      .select('skill_name interest_level')
      .sort({ interest_level: -1, skill_name: 1 })
      .limit(10)
      .then((skills) =>
        skills.map((skill) => ({
          _id: skill._id,
          skillName: skill.skill_name,
          interestLevel: skill.interest_level || 5.0,
        }))
      );

    // Get people with similar skills in the same organization
    const mySkillNames = await Skill.find({ user_id: userId }).distinct('skill_name');

    const similarPeople = await Skill.aggregate([
      {
        $match: {
          user_id: { $ne: userId },
          skill_name: { $in: mySkillNames },
        },
      },
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
          commonSkills: { $sum: 1 },
        },
      },
      {
        $sort: { commonSkills: -1 },
      },
      {
        $limit: 3,
      },
    ]);

    // Get skills the employee wants to improve (skills with lower skill level but high interest)
    const improveSkills = await Skill.find({
      user_id: userId,
      interest_level: { $gte: 4 },
    })
      .select('skill_name skill_level interest_level')
      .sort({ interest_level: -1, skill_level: 1 })
      .limit(20)
      .then((skills) =>
        skills
          .filter((skill) => {
            const level = parseInt(skill.skill_level, 10);
            return !Number.isNaN(level) && level < 4;
          })
          .slice(0, 4)
          .map((skill) => ({
            _id: skill._id,
            skillName: skill.skill_name,
          }))
      );

    return res.status(200).json({
      success: true,
      data: {
        totalSkills,
        skillsByCategory,
        recentSkills,
        assignedQuestionnaires,
        completedQuestionnaires,
        neverCompleted,
        averageSkillLevel,
        averageInterestLevel,
        skillPoints,
        topCategories,
        topSkills,
        topInterests,
        similarPeople,
        improveSkills,
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

const SECURITY_GROUP_LABELS: Record<string, string> = {
  admin: 'Administrator',
  company: 'Administrator',
  employee: 'Employee',
};

function splitFullName(fullName: string): { firstName: string; surname: string } {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || '',
    surname: parts.length > 1 ? parts.slice(1).join(' ') : '',
  };
}

/**
 * Get company dashboard "About" tab data for the logged-in company user
 */
export const getCompanyAbout = async (req: Request, res: Response) => {
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

    const user = await UserModel.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const { firstName, surname } = splitFullName(user.fullName);

    let roleLabel = user.title || user.department || '';
    if (user.designationId) {
      const designation = await RoleModel.findById(user.designationId);
      if (designation?.designationName) {
        roleLabel = designation.designationName;
      }
    }

    const skillCount = await Skill.countDocuments({ user_id: userId });
    const categoryGroups = await Skill.aggregate([
      { $match: { user_id: userId } },
      { $group: { _id: '$cat_id' } },
      { $count: 'total' },
    ]);
    const categoryCount = categoryGroups[0]?.total || 0;

    let skillSet = 'No skills';
    if (skillCount > 0) {
      skillSet = categoryCount > 0 ? 'All skills' : `${skillCount} skill${skillCount === 1 ? '' : 's'}`;
    }

    const employeeCount = organisationId
      ? await UserModel.countDocuments({ organisationId, role: 'employee' })
      : 0;

    const userDoc = user.toObject() as typeof user & { createdAt?: Date };

    return res.status(200).json({
      success: true,
      data: {
        firstName,
        surname,
        email: user.email,
        role: roleLabel,
        skillSet,
        securityGroup: SECURITY_GROUP_LABELS[user.role] || user.role,
        supervises: employeeCount > 0 ? 'All people' : '(none)',
        supervisors: '(none)',
        lastLoginAt: user.lastLoginAt || null,
        accountType: 'Local',
        createdAt: userDoc.createdAt || null,
        fullName: user.fullName,
      },
    });
  } catch (error: any) {
    console.error('Error fetching company about data:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching about data',
      error: error.message,
    });
  }
};

/**
 * Get company dashboard "Assessments" tab data for the logged-in company user
 */
export const getCompanyAssessments = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!userId || userRole !== 'company') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '10'), 10) || 10));

    const user = await UserModel.findById(userId).select('fullName');

    const lastSelfSkill = await Skill.findOne({ user_id: userId })
      .sort({ created_at: -1 })
      .select('created_at');

    const historyAggregation = await Skill.aggregate([
      { $match: { user_id: userId } },
      {
        $lookup: {
          from: 'skillcategories',
          localField: 'cat_id',
          foreignField: '_id',
          as: 'category',
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$created_at' },
          },
          skillCount: { $sum: 1 },
          categories: {
            $addToSet: { $arrayElemAt: ['$category.cat_name', 0] },
          },
          completedAt: { $max: '$created_at' },
        },
      },
      { $sort: { completedAt: -1 } },
    ]);

    const totalRecords = historyAggregation.length;
    const paginatedHistory = historyAggregation.slice((page - 1) * limit, page * limit);

    const history = paginatedHistory.map((item) => ({
      completionDate: item.completedAt,
      type: 'Self assessment',
      skillSet: 'All skills',
      categories: item.categories.filter(Boolean).length,
      skills: item.skillCount,
      overallComments: '',
      completedBy: user?.fullName || '',
      completedById: userId,
    }));

    return res.status(200).json({
      success: true,
      data: {
        selfAssessment: {
          lastCompletedAt: lastSelfSkill?.created_at || null,
        },
        supervisorAssessment: {
          lastCompletedAt: null,
        },
        history,
        pagination: {
          page,
          limit,
          totalRecords,
          totalPages: Math.max(1, Math.ceil(totalRecords / limit)),
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching company assessments:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching assessments data',
      error: error.message,
    });
  }
};
