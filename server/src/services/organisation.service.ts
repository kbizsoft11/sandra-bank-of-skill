// organisation.service.ts

import { Types } from 'mongoose';
import { UserModel } from '../models/user.model';
import { Organisation } from '../models/organisation.model';
import { Skill } from '../models/skill.model';

export const organisationService = {
  /**
   * Get all companies with aggregated data
   * Admin only endpoint
   */
  getAllCompanies: async (page = 1, limit = 20, filters?: { search?: string; status?: string }) => {
    try {
      const skip = (page - 1) * limit;

      // Build match stage for company users
      const matchStage: any = { role: 'company' };

      // Apply search filter
      if (filters?.search) {
        matchStage.$or = [
          { fullName: { $regex: filters.search, $options: 'i' } },
          { email: { $regex: filters.search, $options: 'i' } },
        ];
      }

      // Apply status filter
      if (filters?.status) {
        matchStage.isActive = filters.status === 'active';
      }

      // Get total count
      const totalCount = await UserModel.countDocuments(matchStage);

      // Get all company users
      const companyUsers = await UserModel.find(matchStage)
        .select('_id tenantId fullName email isActive createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      // For each company user, get organisation details and statistics
      const companies = await Promise.all(
        companyUsers.map(async (user: any) => {
          try {
            const org = await Organisation.findOne({ tenantId: user.tenantId }).lean();

            const employeeCount = await UserModel.countDocuments({
              tenantId: user.tenantId,
              role: 'employee',
            });

            return {
              _id: user._id,
              fullName: user.fullName,
              email: user.email,
              profileImage: '',
              accountStatus: user.isActive ? 'active' : 'inactive',
              isActive: user.isActive,
              createdAt: user.createdAt,
              industry: org?.industry || 'N/A',
              website: org?.website,
              companySize: org?.companySize,
              country: org?.country,
              employeeCount,
            };
          } catch (error) {
            console.error('Error processing company:', error);
            return null;
          }
        })
      );

      return {
        companies: companies.filter((c) => c !== null),
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit),
        },
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get company details by company user ID
   */
  getCompanyDetails: async (companyId: string) => {
    try {
      // First, find the company user to get the tenantId
      const companyUser = await UserModel.findById(companyId).select('tenantId fullName email role isActive').lean() as any;

      if (!companyUser || companyUser.role !== 'company') {
        throw new Error('Company not found');
      }

      // Then, find the organisation using the tenantId
      const organisation = await Organisation.findOne({
        tenantId: companyUser.tenantId,
      }).lean() as any;

      if (!organisation) {
        throw new Error('Organisation details not found');
      }

      // Lookup employees count
      const employeeCount = await UserModel.countDocuments({
        tenantId: companyUser.tenantId,
        role: 'employee',
      });

      // Lookup active employees count
      const activeEmployeeCount = await UserModel.countDocuments({
        tenantId: companyUser.tenantId,
        role: 'employee',
        isActive: true,
      });

      // Lookup employees and count their unique skills
      const employees = await UserModel.find({
        tenantId: companyUser.tenantId,
        role: 'employee',
      }).select('_id').lean() as any[];

      const employeeIds = employees.map((emp: any) => emp._id);
      const skillCount = await Skill.countDocuments({
        user_id: { $in: employeeIds },
      });

      return {
        _id: companyUser._id,
        fullName: companyUser.fullName || organisation.organisationName,
        email: companyUser.email,
        phone: '',
        profileImage: '',
        accountStatus: companyUser.isActive ? 'active' : 'inactive',
        isActive: companyUser.isActive,
        createdAt: organisation.createdAt || new Date(),
        industry: organisation.industry,
        website: organisation.website,
        companySize: organisation.companySize,
        country: organisation.country,
        description: organisation.description,
        organisationId: organisation._id,
        totalEmployees: employeeCount,
        activeEmployees: activeEmployeeCount,
        totalSkills: skillCount,
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get employees by organization (company) ID
   * Returns only employees belonging to the company
   */
  getEmployeesByOrganisation: async (
    companyId: string,
    page = 1,
    limit = 20,
    filters?: { search?: string; status?: string }
  ) => {
    // First, get the company to find its tenantId
    const company = await UserModel.findById(companyId).select('tenantId');

    if (!company || !company.tenantId) {
      throw new Error('Company not found');
    }

    const skip = (page - 1) * limit;

    // Build match stage for employees
    const matchStage: any = {
      tenantId: company.tenantId,
      role: 'employee',
    };

    // Apply search filter
    if (filters?.search) {
      matchStage.$or = [
        { fullName: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } },
      ];
    }

    // Apply status filter
    if (filters?.status) {
      matchStage.isActive = filters.status === 'active';
    }

    // Get total count
    const totalCount = await UserModel.countDocuments(matchStage);

    // Build pipeline
    const pipeline: any[] = [
      { $match: matchStage },

      // Lookup skills count
      {
        $lookup: {
          from: 'skills',
          localField: '_id',
          foreignField: 'user_id',
          as: 'skills',
        },
      },

      // Project fields
      {
        $project: {
          _id: 1,
          fullName: 1,
          email: 1,
          role: 1,
          department: 1,
          location: 1,
          profileImage: 1,
          isActive: 1,
          accountStatus: 1,
          createdAt: 1,
          skillsCount: { $size: '$skills' },
        },
      },

      // Sort
      { $sort: { fullName: 1 } },

      // Pagination
      { $skip: skip },
      { $limit: limit },
    ];

    const employees = await UserModel.aggregate(pipeline);

    return {
      employees,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  },

  /**
   * Get skills for a specific employee
   * Returns read-only skills information
   */
  getEmployeeSkills: async (employeeId: string) => {
    try {
      // Convert employeeId string to MongoDB ObjectId
      let objectId;
      try {
        objectId = new Types.ObjectId(employeeId);
      } catch (error) {
        throw new Error('Invalid employee ID format');
      }

      const pipeline: any[] = [
        // Match the employee - using ObjectId
        { $match: { user_id: objectId } },

        // Lookup skill category
        {
          $lookup: {
            from: 'skillcategories',
            localField: 'cat_id',
            foreignField: '_id',
            as: 'category',
          },
        },

        // Unwind category
        {
          $unwind: {
            path: '$category',
            preserveNullAndEmptyArrays: true,
          },
        },

        // Project fields
        {
          $project: {
            _id: 1,
            skill_name: 1,
            skill_level: 1,
            skill_score: 1,
            yearsOfExperience: {
              $cond: [
                { $eq: ['$skill_level', 'Expert'] },
                5,
                { $cond: [{ $eq: ['$skill_level', 'Proficient'] }, 3, 1] },
              ],
            },
            category: {
              _id: '$category._id',
              cat_name: '$category.cat_name',
            },
            created_at: 1,
          },
        },

        // Sort by created date descending
        { $sort: { created_at: -1 } },
      ];

      const skills = await Skill.aggregate(pipeline);
      return skills;
    } catch (error) {
      console.error('Error getting employee skills:', error);
      throw error;
    }
  },

  /**
   * Update company status (activate/deactivate)
   */
  updateCompanyStatus: async (companyId: string, isActive: boolean) => {
    const company = await UserModel.findByIdAndUpdate(
      companyId,
      {
        isActive,
        accountStatus: isActive ? 'active' : 'inactive',
      },
      { new: true }
    ).select('-password');

    if (!company) {
      throw new Error('Company not found');
    }

    return company;
  },
};
