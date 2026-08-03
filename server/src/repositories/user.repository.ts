// user.repository.ts

import { IUser } from "../types/user.types";
import { UserModel } from "../models/user.model";
import { Skill } from "../models/skill.model";
import { CreateUserDto } from "../dto/create-user.dto";
import { UserRole } from "../types/common.types";

export const userRepository = {
  create: async (
    payload: CreateUserDto & {
      role: UserRole;
      tenantId: string;
      profileCompleted: boolean;
      hasCompletedOnboarding?: boolean;
      isActive: boolean;
      designationId?: string;
    },
  ) => {
    return UserModel.create(payload);
  },

  findAll: async (role?: UserRole, tenantId?: string) => {
    const filter: any = {};
    
    if (role) {
      filter.role = role;
    }
    
    if (tenantId) {
      filter.tenantId = tenantId;
    }
    
    // Use aggregation pipeline to include designation lookup
    const pipeline: any[] = [
      { $match: filter },
      
      // Lookup designation from roles - convert designationId string to ObjectId for comparison
      {
        $lookup: {
          from: 'roles',
          let: { designationId: '$designationId' },
          pipeline: [
            { 
              $match: { 
                $expr: { 
                  $eq: ['$_id', { $toObjectId: '$$designationId' }] 
                } 
              } 
            },
          ],
          as: 'designation',
        },
      },

      // Unwind designation (handle null case)
      {
        $unwind: {
          path: '$designation',
          preserveNullAndEmptyArrays: true,
        },
      },

      // Project fields - include all user fields plus designationName
      {
        $project: {
          password: 0,
          designation: 0,
          designationName: { $ifNull: ['$designation.designationName', null] },
        },
      },
    ];
    
    return UserModel.aggregate(pipeline);
  },

  findById: async (id: string) => {
    const ObjectId = require('mongoose').Types.ObjectId;
    const pipeline: any[] = [
      { $match: { _id: new ObjectId(id) } },
      
      // Convert designationId to string for comparison if it's an ObjectId
      {
        $addFields: {
          designationIdStr: { $toString: '$designationId' }
        }
      },
      
      // Lookup designation from roles
      {
        $lookup: {
          from: 'roles',
          let: { designationId: '$designationIdStr' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: [{ $toString: '$_id' }, '$$designationId']
                }
              }
            }
          ],
          as: 'designation',
        },
      },

      // Unwind designation (optional, single value)
      {
        $unwind: {
          path: '$designation',
          preserveNullAndEmptyArrays: true,
        },
      },

      // Project fields - include only what we need
      {
        $project: {
          _id: 1,
          fullName: 1,
          email: 1,
          role: 1,
          title: 1,
          department: 1,
          location: 1,
          team: 1,
          bio: 1,
          profileImage: 1,
          isActive: 1,
          accountStatus: 1,
          designationId: 1,
          organisationId: 1,
          tenantId: 1,
          createdAt: 1,
          updatedAt: 1,
          designationName: { $ifNull: ['$designation.designationName', null] },
        },
      },
    ];

    const result = await UserModel.aggregate(pipeline);
    return result.length > 0 ? result[0] : null;
  },

  findByIds: async (ids: string[]) => {
    return UserModel.find({ _id: { $in: ids } }).select("-password");
  },

  update: async (id: string, payload: Partial<IUser>) => {
    return UserModel.findByIdAndUpdate(id, payload, {
      new: true,
    }).select("-password");
  },

  delete: async (id: string) => {
    return UserModel.findByIdAndDelete(id);
  },

  findByEmail: async (email: string) => {
    return UserModel.findOne({ email });
  },

  getDistinctDepartments: async () => {
    const departments = await UserModel.aggregate([
      { $match: { department: { $exists: true, $ne: '' } } },
      { $group: { _id: { $toLower: '$department' }, value: { $first: '$department' } } },
      { $sort: { value: 1 } },
      { $project: { _id: 0, value: 1 } },
    ]);
    return departments.map((item: any) => item.value);
  },

  getDistinctTeams: async () => {
    const teams = await UserModel.aggregate([
      { $match: { team: { $exists: true, $ne: '' } } },
      { $group: { _id: { $toLower: '$team' }, value: { $first: '$team' } } },
      { $sort: { value: 1 } },
      { $project: { _id: 0, value: 1 } },
    ]);
    return teams.map((item: any) => item.value);
  },

  getDistinctJobRoles: async () => {
    const jobRoles = await UserModel.aggregate([
      { $match: { title: { $exists: true, $ne: '' } } },
      { $group: { _id: { $toLower: '$title' }, value: { $first: '$title' } } },
      { $sort: { value: 1 } },
      { $project: { _id: 0, value: 1 } },
    ]);
    return jobRoles.map((item: any) => item.value);
  },

  searchEmployees: async (params: {
    search?: string;
    skill?: string;
    category?: string;
    department?: string;
    tenantId?: string;
    page?: number;
    limit?: number;
    sortKey?: string;
    sortDirection?: string;
    status?: string;
    accountStatus?: string;
    excludeAccountStatus?: string;
  }) => {
    const {
      search,
      skill,
      category,
      department,
      tenantId,
      page = 1,
      limit = 20,
      sortKey,
      sortDirection,
      status,
      accountStatus,
      excludeAccountStatus,
    } = params;

    // Build the aggregation pipeline
    const pipeline: any[] = [];

    // Match employees only (and optionally filter by tenantId for company users)
    const matchStage: any = { role: 'employee' };
    if (tenantId) {
      matchStage.tenantId = tenantId;
    }
    pipeline.push({ $match: matchStage });

    // Lookup skills from skilluser collection
    pipeline.push({
      $lookup: {
        from: 'skillusers',
        localField: '_id',
        foreignField: 'userId',
        as: 'skillUsers',
      },
    });

    // Lookup skill details
    pipeline.push({
      $lookup: {
        from: 'skills',
        localField: 'skillUsers.skillId',
        foreignField: '_id',
        as: 'skills',
      },
    });

    // Filter out archived skills
    pipeline.push({
      $addFields: {
        skills: {
          $filter: {
            input: '$skills',
            as: 'skill',
            cond: { $eq: ['$$skill.archived', false] }
          }
        }
      }
    });

    // Lookup skill categories through skills
    pipeline.push({
      $lookup: {
        from: 'skillcategories',
        localField: 'skills.categoryId',
        foreignField: '_id',
        as: 'skillCategories',
      },
    });

    // Lookup organisation
    pipeline.push({
      $lookup: {
        from: 'organisations',
        localField: 'organisationId',
        foreignField: '_id',
        as: 'organisation',
      },
    });

    // Unwind organisation (optional, single value)
    pipeline.push({
      $unwind: {
        path: '$organisation',
        preserveNullAndEmptyArrays: true,
      },
    });

    // Lookup designation from roles
    pipeline.push({
      $lookup: {
        from: 'roles',
        let: { designationId: '$designationId' },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ['$_id', { $toObjectId: '$$designationId' }]
              }
            }
          }
        ],
        as: 'designation',
      },
    });

    // Unwind designation (optional, single value)
    pipeline.push({
      $unwind: {
        path: '$designation',
        preserveNullAndEmptyArrays: true,
      },
    });

    // Apply filters
    const filterStage: any = {};

    // Text search on employee name or email
    if (search) {
      filterStage.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    // Filter by skill name
    if (skill) {
      filterStage['skills.name'] = { $regex: skill, $options: 'i' };
    }

    // Filter by skill category name
    if (category) {
      filterStage['skillCategories.name'] = { $regex: category, $options: 'i' };
    }

    // Filter by department
    if (department) {
      filterStage.department = { $regex: department, $options: 'i' };
    }

    // Filter by account status
    if (accountStatus) {
      filterStage.accountStatus = accountStatus;
    } else if (status) {
      filterStage.accountStatus = status;
    } else if (excludeAccountStatus) {
      filterStage.accountStatus = { $ne: excludeAccountStatus };
    }

    if (Object.keys(filterStage).length > 0) {
      pipeline.push({ $match: filterStage });
    }

    // Project the fields we need
    pipeline.push({
      $project: {
        _id: 1,
        fullName: 1,
        email: 1,
        role: 1,
        isActive: 1,
        accountStatus: 1,
        department: 1,
        location: 1,
        title: 1,
        profileImage: 1,
        tenantId: 1,
        organisationId: 1,
        designationId: 1,
        designationName: { $ifNull: ['$designation.designationName', null] },
        'organisation.organisationName': 1,
        skills: {
          $map: {
            input: '$skills',
            as: 'skill',
            in: {
              _id: '$$skill._id',
              name: '$$skill.name',
              categoryId: '$$skill.categoryId',
            },
          },
        },
        skillUsers: {
          $map: {
            input: '$skillUsers',
            as: 'su',
            in: {
              skillId: '$$su.skillId',
              score: '$$su.score',
              level: '$$su.level',
            },
          },
        },
        skillCategories: {
          $map: {
            input: '$skillCategories',
            as: 'cat',
            in: {
              _id: '$$cat._id',
              name: '$$cat.name',
            },
          },
        },
      },
    });

    // Apply sorting if requested (before pagination)
    if (sortKey) {
      const sortStage: any = {};
      sortStage[sortKey] = sortDirection === 'desc' ? -1 : 1;
      pipeline.push({ $sort: sortStage });
    }

    // Get total count before pagination
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await UserModel.aggregate(countPipeline);
    const total = countResult.length > 0 ? countResult[0].total : 0;

    // Add pagination
    pipeline.push({ $skip: (Number(page) - 1) * Number(limit) });
    pipeline.push({ $limit: Number(limit) });

    // Execute the aggregation
    const employees = await UserModel.aggregate(pipeline);

    return {
      employees,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    };
  },

  getCompanySkills: async (tenantId: string) => {
    const pipeline: any[] = [];

    // Start from skills collection
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'user_id',
        foreignField: '_id',
        as: 'user',
      },
    });

    // Unwind user
    pipeline.push({ $unwind: '$user' });

    // Filter by tenantId and employee role
    pipeline.push({
      $match: {
        'user.tenantId': tenantId,
        'user.role': 'employee',
      },
    });

    // Lookup skill category
    pipeline.push({
      $lookup: {
        from: 'skillcategories',
        localField: 'cat_id',
        foreignField: '_id',
        as: 'category',
      },
    });

    // Unwind category
    pipeline.push({ $unwind: '$category' });

    // Group by skill name and category
    pipeline.push({
      $group: {
        _id: {
          skill_name: '$skill_name',
          cat_id: '$cat_id',
          cat_name: '$category.cat_name',
        },
        employeeCount: { $sum: 1 },
        averageScore: { $avg: '$skill_score' },
        representativeSkillId: { $first: '$_id' },
        employees: {
          $push: {
            _id: '$user._id',
            fullName: '$user.fullName',
            email: '$user.email',
            department: '$user.department',
            location: '$user.location',
            skill_level: '$skill_level',
            skill_score: '$skill_score',
          },
        },
      },
    });

    // Project final structure
    pipeline.push({
      $project: {
        _id: 0,
        skill_name: '$_id.skill_name',
        category: {
          _id: '$_id.cat_id',
          cat_name: '$_id.cat_name',
        },
        employeeCount: 1,
        averageScore: 1,
        representativeSkillId: 1,
        employees: 1,
      },
    });

    const skills = await Skill.aggregate(pipeline);
    return skills;
  },

  getEmployeesBySkill: async (skillName: string, tenantId: string) => {
    const pipeline: any[] = [];

    // Match by skill name
    pipeline.push({
      $match: {
        skill_name: { $regex: new RegExp(`^${skillName}$`, 'i') },
      },
    });

    // Lookup user
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'user_id',
        foreignField: '_id',
        as: 'user',
      },
    });

    // Unwind user
    pipeline.push({ $unwind: '$user' });

    // Filter by tenantId and employee role
    pipeline.push({
      $match: {
        'user.tenantId': tenantId,
        'user.role': 'employee',
      },
    });

    // Lookup category
    pipeline.push({
      $lookup: {
        from: 'skillcategories',
        localField: 'cat_id',
        foreignField: '_id',
        as: 'category',
      },
    });

    // Unwind category
    pipeline.push({ $unwind: '$category' });

    // Project employee details
    pipeline.push({
      $project: {
        _id: '$user._id',
        skillId: '$_id',
        title: '$user.title',
        profileImage: '$user.profileImage',
        fullName: '$user.fullName',
        email: '$user.email',
        department: '$user.department',
        location: '$user.location',
        createdAt: '$created_at',
        skill_level: '$skill_level',
        skill_score: '$skill_score',
        category: {
          _id: '$category._id',
          cat_name: '$category.cat_name',
        },
      },
    });

    // Sort by skill score descending
    pipeline.push({ $sort: { skill_score: -1, fullName: 1 } });

    const employees = await Skill.aggregate(pipeline);

    return employees;
  },

  /**
   * Get all users with pagination, search, filter, and sort
   */
  getAllUsersWithPagination: async (params: {
    page: number;
    limit: number;
    search?: string;
    role?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => {
    const {
      page = 1,
      limit = 20,
      search,
      role,
      status,
      sortBy = 'fullName',
      sortOrder = 'asc'
    } = params;

    // Build filter
    const filter: any = {};

    // Search by name or email
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    // Filter by role
    if (role) {
      filter.role = role;
    }

    // Filter by account status
    if (status) {
      filter.accountStatus = status;
    }

    // Calculate skip
    const skip = (page - 1) * limit;

    // Build sort object
    const sortObj: any = {};
    sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Get total count
    const total = await UserModel.countDocuments(filter);

    // Get users with pagination, sort, and designation lookup
    const pipeline: any[] = [
      { $match: filter },
      
      // Lookup designation from roles - convert designationId string to ObjectId for comparison
      {
        $lookup: {
          from: 'roles',
          let: { designationId: '$designationId' },
          pipeline: [
            { 
              $match: { 
                $expr: { 
                  $eq: ['$_id', { $toObjectId: '$$designationId' }] 
                } 
              } 
            },
          ],
          as: 'designation',
        },
      },

      // Unwind designation (handle null case)
      {
        $unwind: {
          path: '$designation',
          preserveNullAndEmptyArrays: true,
        },
      },

      // Add designationName field
      {
        $addFields: {
          designationName: { $ifNull: ['$designation.designationName', null] },
        },
      },

      { $sort: sortObj },
      { $skip: skip },
      { $limit: limit },

      // Project fields - exclude password and temporary designation object
      {
        $project: {
          password: 0,
          designation: 0,
        },
      },
    ];

    const users = await UserModel.aggregate(pipeline);

    return {
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * Get company employees with pagination, search, filter, and sort
   */
  getCompanyEmployeesWithPagination: async (tenantId: string, params: {
    page: number;
    limit: number;
    search?: string;
    role?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => {
    const {
      page = 1,
      limit = 20,
      search,
      role,
      status,
      sortBy = 'fullName',
      sortOrder = 'asc'
    } = params;

    // Build filter for company employees only
    const filter: any = {
      tenantId: tenantId,
      role: 'employee'
    };

    // Search by name or email
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    // Filter by role (for company, always employee but can filter further)
    if (role && role !== 'employee') {
      filter.role = role;
    }

    // Filter by account status
    if (status) {
      filter.accountStatus = status;
    }

    // Calculate skip
    const skip = (page - 1) * limit;

    // Build sort object
    const sortObj: any = {};
    sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Get total count
    const total = await UserModel.countDocuments(filter);

    // Get employees with pagination, sort, and designation lookup
    const pipeline: any[] = [
      { $match: filter },
      
      // Lookup designation from roles - convert designationId string to ObjectId for comparison
      {
        $lookup: {
          from: 'roles',
          let: { designationId: '$designationId' },
          pipeline: [
            { 
              $match: { 
                $expr: { 
                  $eq: ['$_id', { $toObjectId: '$$designationId' }] 
                } 
              } 
            },
          ],
          as: 'designation',
        },
      },

      // Unwind designation (handle null case)
      {
        $unwind: {
          path: '$designation',
          preserveNullAndEmptyArrays: true,
        },
      },

      // Add designationName field
      {
        $addFields: {
          designationName: { $ifNull: ['$designation.designationName', null] },
        },
      },

      { $sort: sortObj },
      { $skip: skip },
      { $limit: limit },

      // Project fields - exclude password and temporary designation object
      {
        $project: {
          password: 0,
          designation: 0,
        },
      },
    ];

    const users = await UserModel.aggregate(pipeline);

    return {
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  exportEmployees: async (filter: Record<string, any>) => {
    const pipeline: any[] = [
      { $match: filter },
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
      { $project: { password: 0 } },
      { $sort: { fullName: 1 } },
    ];

    return UserModel.aggregate(pipeline);
  },
};
