import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { UserModel } from '../models/user.model';
import { Skill } from '../models/skill.model';
import { SkillCategory } from '../models/skillCategory.model';
import { QuestionnaireModel } from '../models/questionnaire.model';
import { RoleModel } from '../models/role.model';
import { ActivityModel } from '../models/activity.model';
import { QuestionnaireResponseModel } from '../models/questionnaire-response.model';
import * as AdminDashboardService from '../services/admin-dashboard.service';

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

    // Get recent employee activities for this company only.
    // `Activity.userId` may be stored as a string, so we convert user _id to string during lookup.
    const recentActivities = await ActivityModel.aggregate([
      { $match: { organisationId } },
      {
        $lookup: {
          from: 'users',
          let: { activityUserId: '$userId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: [{ $toString: '$_id' }, '$$activityUserId'],
                },
              },
            },
          ],
          as: 'user',
        },
      },
      { $unwind: '$user' },
      { $match: { 'user.role': 'employee' } },
      { $sort: { createdAt: -1 } },
      { $limit: 5 },
      {
        $project: {
          _id: 1,
          user: 1,
          activity: 1,
          createdAt: 1,
        },
      },
    ]);

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
        recentActivities: recentActivities.map(activity => ({
          _id: activity._id?.toString?.() || undefined,
          employeeName: activity.user?.fullName || activity.user || 'Employee',
          activity: activity.activity || 'Updated records',
          timestamp: activity.createdAt?.toISOString?.() || '',
        })),
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

    const employee = await UserModel.findById(userId).select('fullName title department location profileImage role designationId');
    const roleLabel = employee?.title || employee?.department || 'Employee';
    const userObjectId = new Types.ObjectId(userId);
    const userSkillFilter = { user_id: userObjectId } as any;

    const skills = await Skill.find(userSkillFilter).sort({ created_at: -1 });
    const totalSkills = skills.length;

    const skillsByCategory = await Skill.aggregate([
      {
        $match: userSkillFilter,
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

    const recentSkills = await Skill.find(userSkillFilter)
      .select('skill_name skill_level skill_score created_at')
      .sort({ created_at: -1 })
      .limit(5);

    const questionnaireResponses = await QuestionnaireResponseModel.find({ employeeId: userId.toString() })
      .sort({ createdAt: -1 })
      .limit(10);

    const assignedQuestionnaires = questionnaireResponses.length;
    const completedQuestionnaires = questionnaireResponses.filter((response) => response.status === 'completed').length;
    const neverCompleted = Math.max(0, assignedQuestionnaires - completedQuestionnaires);

    const levelValues: Record<string, number> = {
      beginner: 1,
      novice: 1,
      intermediate: 2,
      developing: 2,
      advanced: 3,
      proficient: 3,
      expert: 4,
      mastery: 4,
    };

    const levelLabels = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

    const getLevelValue = (value?: string) => {
      if (!value) return 0;
      const normalized = value.toLowerCase();
      return levelValues[normalized] || 0;
    };

    const getLevelLabel = (value?: string) => {
      const levelValue = getLevelValue(value);
      return levelLabels[Math.max(0, Math.min(levelValue - 1, levelLabels.length - 1))] || 'Beginner';
    };

    const getTargetLevel = (value?: string) => {
      const currentValue = getLevelValue(value);
      const targetValue = Math.min(4, currentValue + 1);
      return levelLabels[Math.max(0, Math.min(targetValue - 1, levelLabels.length - 1))] || 'Intermediate';
    };

    const getProgressPercent = (skill: any) => {
      if (typeof skill.skill_score === 'number' && skill.skill_score >= 0) {
        return Math.min(100, Math.max(0, Math.round(skill.skill_score)));
      }
      const current = getLevelValue(skill.skill_level);
      return Math.min(100, current * 25);
    };

    // Calculate averages using actual numeric values from skill_score (which is set as level * 20)
    // If skill_score represents level * 20, then: level = skill_score / 20
    // But we also need to handle old skills that don't have skill_score
    const skillLevels = skills.map((skill: any): number => {
      // For new questionnaire-based skills, use skill_score to derive level
      if (skill.skill_score && skill.skill_score > 0) {
        return Math.min(5, Math.max(1, Math.round(skill.skill_score / 20)));
      }
      // For old skills, use the string-based level
      return getLevelValue(skill.skill_level);
    }).filter(level => level > 0);

    const averageSkillLevel = skillLevels.length > 0
      ? skillLevels.reduce((total, level) => total + level, 0) / skillLevels.length
      : 0;

    // Calculate average interest level (1-5 scale)
    const interestLevels = (skills as any)
      .map((skill: any) => skill.interest_level || 0)
      .filter((level: number) => level > 0);

    const averageInterestLevel = interestLevels.length > 0
      ? interestLevels.reduce((total: number, level: number) => total + level, 0) / interestLevels.length
      : 0;

    // Calculate total skill points (sum of all skill levels)
    const skillPoints = skillLevels.reduce((total, level) => total + level, 0);

    // Get top categories by average skill level
    const topCategories = await Skill.aggregate([
      {
        $match: userSkillFilter,
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
        $addFields: {
          // Convert skill_score (0-100) to level (1-5) for aggregation
          // skill_score = level * 20, so level = skill_score / 20
          skillLevelNumeric: {
            $cond: {
              if: { $and: [{ $gt: ['$skill_score', 0] }, { $lte: ['$skill_score', 100] }] },
              then: { $divide: ['$skill_score', 20] },
              else: '$skill_level', // Fallback to string level (will be converted)
            },
          },
        },
      },
      {
        $group: {
          _id: '$category.cat_name',
          count: { $sum: 1 },
          averageLevel: { $avg: '$skillLevelNumeric' } as any,
          totalPoints: { $sum: '$skillLevelNumeric' } as any,
        },
      },
      {
        $sort: { averageLevel: -1 } as any,
      },
      {
        $limit: 5,
      },
    ]);

    // Get top skills by skill level (sorted highest to lowest)
    const topSkills = await Skill.find(userSkillFilter)
      .select('name level score')
      .sort({ score: -1, interest_level: -1 })
      .limit(10)
      .lean()
      .then((skillsList: any) =>
        skillsList.map((skill: any) => {
          // Calculate level from skill_score
          const levelFromScore = skill.skill_score && skill.skill_score > 0
            ? Math.min(5, Math.max(1, Math.round(skill.skill_score / 20)))
            : getLevelValue(skill.skill_level);
          
          return {
            _id: skill._id,
            skillName: skill.skill_name || skill.name,
            skillLevel: levelFromScore,
            skillLevelLabel: getLevelLabel(skill.skill_level),
            interestLevel: skill.interest_level || 0,
          };
        })
      );

    // Get top interests (skills with highest interest level)
    const topInterests = await Skill.find({
      ...userSkillFilter,
      interest_level: { $gte: 1 }
    } as any)
      .select('name interest_level level score')
      .sort({ interest_level: -1, score: -1 })
      .limit(10)
      .lean()
      .then((skillsList: any) =>
        skillsList.map((skill: any) => {
          const levelFromScore = skill.skill_score && skill.skill_score > 0
            ? Math.min(5, Math.max(1, Math.round(skill.skill_score / 20)))
            : getLevelValue(skill.skill_level);
          
          return {
            _id: skill._id,
            skillName: skill.skill_name || skill.name,
            interestLevel: skill.interest_level || 0,
            skillLevel: levelFromScore,
            skillLevelLabel: getLevelLabel(skill.skill_level),
          };
        })
      );

    const mySkills = skills.slice(0, 6).map((skill: any) => ({
      _id: skill._id,
      skillName: skill.skill_name || skill.name,
      currentLevel: getLevelLabel(skill.skill_level),
      targetLevel: getTargetLevel(skill.skill_level),
      progress: getProgressPercent(skill),
      verificationStatus: (skill.skill_score ?? 0) >= 80 ? 'Verified' : 'Pending Verification',
      skillScore: skill.skill_score ?? 0,
    }));

    const skillGaps = (skills as any)
      .filter((skill: any) => {
        const currentValue = getLevelValue(skill.skill_level);
        return currentValue < 4 && (skill.skill_score ?? 0) < 80;
      })
      .slice(0, 4)
      .map((skill: any) => ({
        _id: skill._id,
        skillName: skill.skill_name || skill.name,
        currentLevel: getLevelLabel(skill.skill_level),
        targetLevel: getTargetLevel(skill.skill_level),
        progress: getProgressPercent(skill),
      }));

    const pendingActions = [] as Array<{ title: string; description: string; status: string; dueDate?: string; actionLabel: string }>;
    const profileCompletionFields = [Boolean(employee?.fullName), Boolean(employee?.title), Boolean(employee?.department), Boolean(employee?.location), totalSkills > 0];
    const profileCompletionPercent = Math.min(100, Math.round((profileCompletionFields.filter(Boolean).length / profileCompletionFields.length) * 100));

    if (profileCompletionPercent < 100) {
      pendingActions.push({
        title: 'Complete your profile basics',
        description: 'Add your title, department, and location so your profile is easier to understand.',
        status: 'Pending',
        actionLabel: 'Update profile',
      });
    }

    if (questionnaireResponses.some((response) => response.status !== 'completed')) {
      pendingActions.push({
        title: 'Complete your assessment',
        description: 'You have outstanding questionnaire work that still needs attention.',
        status: 'In progress',
        actionLabel: 'Open assessment',
      });
    }

    if (skills.some((skill: any) => (skill.skill_score ?? 0) < 80)) {
      pendingActions.push({
        title: 'Add evidence for your skills',
        description: 'Strengthen your current skills with more evidence or updated assessments.',
        status: 'Needs review',
        actionLabel: 'Add evidence',
      });
    }

    if (!pendingActions.length) {
      pendingActions.push({
        title: 'You are all caught up',
        description: 'No immediate actions are waiting for your review right now.',
        status: 'Complete',
        actionLabel: 'View skills',
      });
    }

    const recentActivities = [
      ...skills.slice(0, 4).map((skill: any) => ({
        type: 'skill',
        title: `${skill.skill_name || skill.name} updated`,
        description: `Current level ${getLevelLabel(skill.skill_level)} with ${skill.skill_score ?? 0}% confidence.`,
        time: (skill.created_at || skill.createdAt || new Date().toISOString()) as string,
        icon: 'bi-lightbulb-fill',
      })),
      ...questionnaireResponses.slice(0, 4).map((response) => ({
        type: response.status === 'completed' ? 'assessment' : 'questionnaire',
        title: response.status === 'completed' ? 'Assessment completed' : 'Assessment in progress',
        description: `Questionnaire response status: ${response.status}.`,
        time: response.completedAt || response.startedAt || response.createdAt || new Date().toISOString(),
        icon: response.status === 'completed' ? 'bi-clipboard-check' : 'bi-clipboard2-plus',
      })),
    ]
      .sort((left, right) => new Date(right.time).getTime() - new Date(left.time).getTime())
      .slice(0, 6);

    const learningRecommendations = skillGaps.length
      ? skillGaps.slice(0, 3).map((skill: any) => ({
          title: `Advance ${skill.skillName}`,
          relatedSkill: skill.skillName,
          duration: skill.targetLevel === 'Expert' ? '6 hours' : '4 hours',
          type: skill.targetLevel === 'Expert' ? 'Specialist path' : 'Development plan',
        }))
      : (skills as any).slice(0, 3).map((skill: any) => ({
          title: `Develop ${skill.skill_name || skill.name}`,
          relatedSkill: skill.skill_name || skill.name,
          duration: '4 hours',
          type: 'Recommended learning',
        }));

    const readinessScore = Math.min(100, Math.max(0, Math.round((averageSkillLevel / 4) * 100)));
    const careerGrowth = {
      currentRole: roleLabel,
      potentialNextRole: roleLabel ? `Senior ${roleLabel}` : 'Senior Specialist',
      readiness: readinessScore,
      requiredSkills: mySkills.slice(0, 4).map((skill) => ({
        name: skill.skillName,
        status: skill.progress >= 80 ? 'completed' : skill.progress >= 50 ? 'in_progress' : 'missing',
      })),
    };

    const mySkillNames = await Skill.find(userSkillFilter).distinct('name');

    const similarPeople = await Skill.aggregate([
      {
        $match: {
          user_id: { $ne: userObjectId },
          name: { $in: mySkillNames },
        } as any,
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

    // Keen to improve: High interest (4-5) but lower skill level (1-3)
    const keenToImprove = await Skill.find({
      ...userSkillFilter,
      interest_level: { $gte: 4 },
    } as any)
      .select('name level score interest_level')
      .sort({ interest_level: -1, score: 1 })
      .limit(20)
      .lean()
      .then((skillsList: any): any[] =>
        skillsList
          .filter((skill: any) => {
            const levelFromScore = skill.skill_score && skill.skill_score > 0
              ? Math.round(skill.skill_score / 20)
              : getLevelValue(skill.skill_level);
            return levelFromScore <= 3; // Only skills at level 3 or below
          })
          .slice(0, 10)
          .map((skill: any) => {
            const levelFromScore = skill.skill_score && skill.skill_score > 0
              ? Math.min(5, Math.max(1, Math.round(skill.skill_score / 20)))
              : getLevelValue(skill.skill_level);
            
            return {
              _id: skill._id,
              skillName: skill.skill_name || skill.name,
              interestLevel: skill.interest_level || 0,
              skillLevel: levelFromScore,
              skillLevelLabel: getLevelLabel(skill.skill_level),
            };
          })
      );

    return res.status(200).json({
      success: true,
      data: {
        employeeProfile: {
          fullName: employee?.fullName || 'Employee',
          title: employee?.title || roleLabel,
          department: employee?.department || 'General',
          location: employee?.location || 'Not provided',
          profileCompletion: profileCompletionPercent,
        },
        summary: {
          totalSkills,
          verifiedSkills: (skills as any).filter((skill: any) => (skill.skill_score ?? 0) >= 80).length,
          skillsInProgress: (skills as any).filter((skill: any) => (skill.skill_score ?? 0) < 80).length,
          profileCompletion: profileCompletionPercent,
          averageSkillLevel: parseFloat(averageSkillLevel.toFixed(2)),
          averageInterestLevel: parseFloat(averageInterestLevel.toFixed(2)),
          skillPoints,
        },
        skillsByCategory,
        recentSkills,
        assignedQuestionnaires,
        completedQuestionnaires,
        neverCompleted,
        averageSkillLevel: parseFloat(averageSkillLevel.toFixed(2)),
        averageInterestLevel: parseFloat(averageInterestLevel.toFixed(2)),
        skillPoints,
        topCategories,
        topSkills,
        topInterests,
        keenToImprove,
        similarPeople,
        mySkills,
        skillGaps,
        pendingActions,
        recentActivities,
        learningRecommendations,
        careerGrowth,
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

    const userObjectId = new Types.ObjectId(userId);
    const userSkillFilter = { user_id: userObjectId } as any;
    const skillCount = await Skill.countDocuments(userSkillFilter);
    const categoryGroups = await Skill.aggregate([
      { $match: userSkillFilter },
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

    const userObjectId = new Types.ObjectId(userId);
    const userSkillFilter = { user_id: userObjectId } as any;
    const lastSelfSkill = await Skill.findOne(userSkillFilter)
      .sort({ created_at: -1 })
      .select('created_at');

    const historyAggregation = await Skill.aggregate([
      { $match: userSkillFilter },
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
          lastCompletedAt: (lastSelfSkill as any)?.created_at || (lastSelfSkill?.createdAt) || null,
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

/**
 * GET /dashboard/admin/overview
 * Get admin dashboard overview statistics
 */
export const getAdminOverview = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!userId || userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const data = await AdminDashboardService.getOverviewStats();

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error('Error fetching admin overview:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching overview statistics',
      error: error.message,
    });
  }
};

/**
 * GET /dashboard/admin/charts
 * Get admin dashboard chart data
 */
export const getAdminCharts = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!userId || userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const month = req.query.month ? parseInt(String(req.query.month), 10) : undefined;
    const year = req.query.year ? parseInt(String(req.query.year), 10) : undefined;

    const data = await AdminDashboardService.getChartData(month, year);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error('Error fetching admin charts:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching chart data',
      error: error.message,
    });
  }
};

/**
 * GET /dashboard/admin/notifications
 * Get admin notifications with filtering
 */
export const getAdminNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!userId || userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const filter = (req.query.filter as 'recent' | 'unread' | 'read') || 'recent';
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '10'), 10) || 10));

    const data = await AdminDashboardService.getNotifications(userId, filter, page, limit);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error('Error fetching admin notifications:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching notifications',
      error: error.message,
    });
  }
};

/**
 * PUT /dashboard/admin/notifications/:id/read
 * Mark notification as read
 */
export const markNotificationAsRead = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const notificationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!userId || userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    await AdminDashboardService.markNotificationAsRead(notificationId);

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    return res.status(500).json({
      success: false,
      message: 'Error marking notification as read',
      error: error.message,
    });
  }
};

/**
 * PUT /dashboard/admin/notifications/:id/unread
 * Mark notification as unread
 */
export const markNotificationAsUnread = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const notificationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!userId || userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    await AdminDashboardService.markNotificationAsUnread(notificationId);

    return res.status(200).json({
      success: true,
      message: 'Notification marked as unread',
    });
  } catch (error: any) {
    console.error('Error marking notification as unread:', error);
    return res.status(500).json({
      success: false,
      message: 'Error marking notification as unread',
      error: error.message,
    });
  }
};

/**
 * GET /dashboard/employee/notifications
 * Get employee notifications with filtering
 */
export const getEmployeeNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!userId || userRole !== 'employee') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const filter = (req.query.filter as 'recent' | 'unread' | 'read') || 'recent';
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(20, Math.max(1, parseInt(String(req.query.limit || '5'), 10) || 5));

    const data = await AdminDashboardService.getEmployeeNotifications(userId, filter, page, limit);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error('Error fetching employee notifications:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching notifications',
      error: error.message,
    });
  }
};

/**
 * PUT /dashboard/employee/notifications/:id/read
 * Mark employee notification as read
 */
export const markEmployeeNotificationAsRead = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const notificationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!userId || userRole !== 'employee') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    await AdminDashboardService.markEmployeeNotificationAsRead(notificationId);

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error: any) {
    console.error('Error marking employee notification as read:', error);
    return res.status(500).json({
      success: false,
      message: 'Error marking notification as read',
      error: error.message,
    });
  }
};

/**
 * PUT /dashboard/employee/notifications/:id/unread
 * Mark employee notification as unread
 */
export const markEmployeeNotificationAsUnread = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const notificationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!userId || userRole !== 'employee') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    await AdminDashboardService.markEmployeeNotificationAsUnread(notificationId);

    return res.status(200).json({
      success: true,
      message: 'Notification marked as unread',
    });
  } catch (error: any) {
    console.error('Error marking employee notification as unread:', error);
    return res.status(500).json({
      success: false,
      message: 'Error marking notification as unread',
      error: error.message,
    });
  }
};

/**
 * GET /dashboard/admin/recent-activities
 * Get recent activities
 */
export const getAdminRecentActivities = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!userId || userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '10'), 10) || 10));

    const data = await AdminDashboardService.getRecentActivities(page, limit);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error('Error fetching recent activities:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching recent activities',
      error: error.message,
    });
  }
};
