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
    
    return UserModel.find(filter).select("-password");
  },

  findById: async (id: string) => {
    return UserModel.findById(id).select("-password");
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

  searchEmployees: async (params: {
    search?: string;
    skill?: string;
    category?: string;
    department?: string;
    tenantId?: string;
    page?: number;
    limit?: number;
  }) => {
    const {
      search,
      skill,
      category,
      department,
      tenantId,
      page = 1,
      limit = 20,
    } = params;

    // Build the aggregation pipeline
    const pipeline: any[] = [];

    // Match employees only (and optionally filter by tenantId for company users)
    const matchStage: any = { role: 'employee' };
    if (tenantId) {
      matchStage.tenantId = tenantId;
    }
    pipeline.push({ $match: matchStage });

    // Lookup skills for each employee
    pipeline.push({
      $lookup: {
        from: 'skills',
        localField: '_id',
        foreignField: 'user_id',
        as: 'skills',
      },
    });

    // Lookup skill categories through skills
    pipeline.push({
      $lookup: {
        from: 'skillcategories',
        localField: 'skills.cat_id',
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
      filterStage['skills.skill_name'] = { $regex: skill, $options: 'i' };
    }

    // Filter by skill category name
    if (category) {
      filterStage['skillCategories.cat_name'] = { $regex: category, $options: 'i' };
    }

    // Filter by department
    if (department) {
      filterStage.department = { $regex: department, $options: 'i' };
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
        department: 1,
        location: 1,
        title: 1,
        profileImage: 1,
        tenantId: 1,
        organisationId: 1,
        'organisation.organisationName': 1,
        skills: {
          $map: {
            input: '$skills',
            as: 'skill',
            in: {
              _id: '$$skill._id',
              skill_name: '$$skill.skill_name',
              skill_level: '$$skill.skill_level',
              skill_score: '$$skill.skill_score',
              cat_id: '$$skill.cat_id',
            },
          },
        },
        skillCategories: {
          $map: {
            input: '$skillCategories',
            as: 'cat',
            in: {
              _id: '$$cat._id',
              cat_name: '$$cat.cat_name',
            },
          },
        },
      },
    });

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
        employees: 1,
      },
    });

    // Sort by employee count descending
    pipeline.push({ $sort: { employeeCount: -1, skill_name: 1 } });

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
        fullName: '$user.fullName',
        email: '$user.email',
        department: '$user.department',
        location: '$user.location',
        title: '$user.title',
        profileImage: '$user.profileImage',
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
};
