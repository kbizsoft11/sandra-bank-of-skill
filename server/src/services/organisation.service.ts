// organisation.service.ts

import { Types } from 'mongoose';
import { UserModel } from '../models/user.model';
import { Organisation } from '../models/organisation.model';
import { Skill } from '../models/skill.model';
import { AccountStatus } from '../types/common.types';
import { hashPassword } from '../utils/password';
import { userRepository } from '../repositories/user.repository';

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

      // Lookup designation from roles
      {
        $lookup: {
          from: 'roles',
          let: { designationId: { $toObjectId: '$designationId' } },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$designationId'] } } },
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

      // Project fields
      {
        $project: {
          _id: 1,
          fullName: 1,
          email: 1,
          role: 1,
          department: 1,
          designationId: 1,
          designationName: { $ifNull: ['$designation.designationName', null] },
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
        accountStatus: isActive ? AccountStatus.ACTIVE : AccountStatus.JOINED,
      },
      { new: true }
    ).select('-password');

    if (!company) {
      throw new Error('Company not found');
    }

    return company;
  },

  /**
   * Create a new company
   */
  createCompany: async (payload: any) => {
    try {
      // Extract company-specific fields
      const {
        fullName,
        email,
        password,
        description,
        industry,
        companySize,
        website,
        country,
      } = payload;

      // Validate required fields
      if (!fullName || !email) {
        throw new Error('Company name and email are required');
      }

      if (!password) {
        throw new Error('Password is required');
      }

      // Check if company already exists
      const existingCompany = await UserModel.findOne({ email });
      if (existingCompany) {
        throw new Error('Company with this email already exists');
      }

      // Hash the password
      const hashedPassword = await hashPassword(password);

      // Create company user
      const company = new UserModel({
        fullName,
        email,
        password: hashedPassword,
        role: 'company',
        isActive: true,
        accountStatus: AccountStatus.JOINED,
        tenantId: new Types.ObjectId().toString(),
      });

      await company.save();

      // Create organisation record
      const organisation = new Organisation({
        tenantId: company.tenantId,
        organisationName: fullName,
        ownerUserId: company._id.toString(),
        description,
        industry,
        companySize,
        website,
        country,
      });

      await organisation.save();

      // Return company without password
      return company.toObject({ transform: (doc: any, ret: any) => {
        delete ret.password;
        return ret;
      }});
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update company details
   */
  updateCompany: async (companyId: string, payload: any) => {
    try {
      const {
        fullName,
        email,
        password,
        description,
        industry,
        companySize,
        website,
        country,
        isActive,
      } = payload;

      // Get the company user
      const company = await UserModel.findById(companyId);
      if (!company) {
        throw new Error('Company not found');
      }

      // Update company user
      if (fullName) company.fullName = fullName;
      if (email) company.email = email;
      
      // Hash password if provided
      if (password) {
        company.password = await hashPassword(password);
      }
      
      if (typeof isActive === 'boolean') {
        company.isActive = isActive;
        company.accountStatus = isActive ? AccountStatus.ACTIVE : AccountStatus.JOINED;
      }

      await company.save();

      // Update organisation record
      const org = await Organisation.findOne({ tenantId: company.tenantId });
      if (org) {
        if (description) org.description = description;
        if (industry) org.industry = industry;
        if (companySize) org.companySize = companySize;
        if (website) org.website = website;
        if (country) org.country = country;
        if (fullName) org.organisationName = fullName;

        await org.save();
      }

      return company.toObject({ transform: (doc: any, ret: any) => {
        delete ret.password;
        return ret;
      }});
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get employee details by employee ID
   * Returns employee profile information with designation name
   */
  getEmployeeDetails: async (employeeId: string) => {
    try {
      let objectId;
      try {
        objectId = new Types.ObjectId(employeeId);
      } catch (error) {
        throw new Error('Invalid employee ID format');
      }

      const employee = await UserModel.findById(objectId)
        .select('-password')
        .lean() as any;

      if (!employee) {
        throw new Error('Employee not found');
      }

      // Get skills count
      const skillsCount = await Skill.countDocuments({
        user_id: new Types.ObjectId(objectId),
      } as any);

      // Get designation name if designationId exists
      let designationName = null;
      if (employee.designationId) {
        const { RoleModel } = await import('../models/role.model');
        try {
          const roleId = new Types.ObjectId(employee.designationId);
          const role = await RoleModel.findById(roleId).select('designationName').lean();
          designationName = role?.designationName || null;
        } catch (err) {
          // Invalid ObjectId format, skip
          designationName = null;
        }
      }

      return {
        ...employee,
        designationName,
        skillsCount,
      };
    } catch (error) {
      console.error('Error getting employee details:', error);
      throw error;
    }
  },

  /**
   * Get employee assessments by employee ID
   * Returns assessments for the employee
   */
  getEmployeeAssessments: async (employeeId: string) => {
    try {
      let objectId;
      try {
        objectId = new Types.ObjectId(employeeId);
      } catch (error) {
        throw new Error('Invalid employee ID format');
      }

      // Since we don't have an Assessment model yet, return empty array
      // This can be extended when Assessment model is added
      return [];
    } catch (error) {
      console.error('Error getting employee assessments:', error);
      throw error;
    }
  },

  /**
   * Get employee activity by employee ID
   * Returns activity log for the employee
   */
  getEmployeeActivity: async (employeeId: string) => {
    try {
      let objectId;
      try {
        objectId = new Types.ObjectId(employeeId);
      } catch (error) {
        throw new Error('Invalid employee ID format');
      }

      // Get user to find when they joined
      const employee = await UserModel.findById(objectId)
        .select('createdAt fullName')
        .lean() as any;

      if (!employee) {
        throw new Error('Employee not found');
      }

      // Return activity log
      const activities = [
        {
          _id: new Types.ObjectId().toString(),
          action: 'Account Created',
          type: 'account',
          description: `${employee.fullName} joined the organization`,
          timestamp: employee.createdAt || new Date(),
        },
      ];

      return activities;
    } catch (error) {
      console.error('Error getting employee activity:', error);
      throw error;
    }
  },

  /**
   * Export organisation employees to Excel
   */
  exportEmployeesToExcel: async (organisationId: string, filters?: { search?: string; status?: string }) => {
    try {
      // Get the company to find its tenantId
      const company = await UserModel.findById(organisationId).select('tenantId');

      if (!company || !company.tenantId) {
        throw new Error('Company not found');
      }

      // Build match stage for employees
      const matchStage: any = {
        tenantId: company.tenantId,
        role: 'employee',
      };

      // Apply filters
      if (filters?.search) {
        matchStage.$or = [
          { fullName: { $regex: filters.search, $options: 'i' } },
          { email: { $regex: filters.search, $options: 'i' } },
        ];
      }

      if (filters?.status) {
        matchStage.isActive = filters.status === 'active';
      }

      // Get all matching employees (no pagination for export)
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

        // Project fields in export order
        {
          $project: {
            _id: 1,
            fullName: 1,
            email: 1,
            department: 1,
            designation: 1,
            phone: 1,
            isActive: 1,
            createdAt: 1,
            skillsCount: { $size: '$skills' },
          },
        },

        // Sort by name
        { $sort: { fullName: 1 } },
      ];

      const employees = await UserModel.aggregate(pipeline);

      // Format data for Excel export
      const data = employees.map((emp: any) => ({
        'Employee Name': emp.fullName || 'N/A',
        'Employee ID': emp._id.toString(),
        'Email': emp.email || 'N/A',
        'Department': emp.department || 'N/A',
        'Designation': emp.designation || 'N/A',
        'Phone': emp.phone || 'N/A',
        'Skills Count': emp.skillsCount || 0,
        'Status': emp.isActive ? 'Active' : 'Inactive',
        'Joined Date': new Date(emp.createdAt).toLocaleDateString('en-US'),
      }));

      return data;
    } catch (error) {
      console.error('Error exporting employees to Excel:', error);
      throw error;
    }
  },

  /**
   * Export organisation employees to CSV
   */
  exportEmployeesToCSV: async (organisationId: string, filters?: { search?: string; status?: string }) => {
    try {
      // Reuse the Excel export logic to get formatted data
      return await organisationService.exportEmployeesToExcel(organisationId, filters);
    } catch (error) {
      console.error('Error exporting employees to CSV:', error);
      throw error;
    }
  },

  /**
   * Create an employee for a specific organisation
   */
  createEmployeeForOrganisation: async (organisationId: string, payload: any) => {
    try {
      // Get the organisation to find its tenantId and ID
      const { Organisation } = await import('../models/organisation.model');
      const { RoleModel } = await import('../models/role.model');
      
      const organisation = await Organisation.findById(organisationId).select('_id tenantId');
      if (!organisation || !organisation.tenantId) {
        throw new Error('Organisation not found');
      }

      // Check if email already exists
      const existingUser = await UserModel.findOne({ email: payload.email });
      if (existingUser) {
        throw new Error('Email already exists');
      }

      // Validate designationId if provided
      if (payload.designationId) {
        const designation = await RoleModel.findOne({
          _id: payload.designationId,
          organisationId: organisationId,
        });
        if (!designation) {
          throw new Error('Selected designation does not belong to this organisation');
        }
      }

      // Hash password - use provided password or generate one
      let hashedPassword;
      if (payload.password && payload.password.trim()) {
        hashedPassword = await require('../utils/password').hashPassword(payload.password);
      } else {
        const generatedPassword = require('../utils/password').generateRandomPassword();
        hashedPassword = await require('../utils/password').hashPassword(generatedPassword);
      }

      // Create the employee using repository pattern
      const newEmployee = await userRepository.create({
        fullName: payload.fullName,
        email: payload.email,
        password: hashedPassword,
        role: 'employee',
        tenantId: organisation.tenantId,
        organisationId: organisationId,
        profileCompleted: false,
        hasCompletedOnboarding: false,
        isActive: payload.isActive !== undefined ? payload.isActive : true,
        phone: payload.phone,
        department: payload.department,
        designationId: payload.designationId,
        emailVerified: false,
        accountStatus: AccountStatus.JOINED,
      });

      return newEmployee;
    } catch (error) {
      console.error('Error creating employee:', error);
      throw error;
    }
  },

  /**
   * Update an employee for a specific organisation
   */
  updateEmployeeForOrganisation: async (organisationId: string, employeeId: string, payload: any) => {
    try {
      const { Organisation } = await import('../models/organisation.model');
      const { RoleModel } = await import('../models/role.model');
      
      // Get the organisation to verify it exists
      const organisation = await Organisation.findById(organisationId).select('_id tenantId');
      if (!organisation || !organisation.tenantId) {
        throw new Error('Organisation not found');
      }

      // Get the employee to verify they belong to this organisation
      const employee = await UserModel.findById(employeeId);
      if (!employee) {
        throw new Error('Employee not found');
      }

      if (employee.organisationId?.toString() !== organisationId) {
        throw new Error('Employee does not belong to this organisation');
      }

      // Validate designationId if provided
      if (payload.designationId) {
        const designation = await RoleModel.findOne({
          _id: payload.designationId,
          organisationId: organisationId,
        });
        if (!designation) {
          throw new Error('Selected designation does not belong to this organisation');
        }
      }

      // Update employee fields
      const updateData: any = {};

      if (payload.fullName !== undefined) updateData.fullName = payload.fullName;
      if (payload.email !== undefined) updateData.email = payload.email;
      if (payload.phone !== undefined) updateData.phone = payload.phone;
      if (payload.department !== undefined) updateData.department = payload.department;
      if (payload.designationId !== undefined) updateData.designationId = payload.designationId;
      if (payload.isActive !== undefined) {
        updateData.isActive = payload.isActive;
        updateData.accountStatus = payload.isActive ? 'active' : 'inactive';
      }

      const updatedEmployee = await UserModel.findByIdAndUpdate(
        employeeId,
        updateData,
        { new: true }
      ).select('-password');

      return updatedEmployee;
    } catch (error) {
      console.error('Error updating employee:', error);
      throw error;
    }
  },

  /**
   * Export company data to Excel
   * Includes company info, employees, and skills
   */
  exportCompanyDataExcel: async (companyId: string) => {
    try {
      const ExcelJS = require('exceljs');
      const { Skill } = await import('../models/skill.model');

      // Get company details
      const company: any = await UserModel.findById(companyId).select('-password');
      if (!company || company.role !== 'company') {
        throw new Error('Company not found');
      }

      // Get all employees for this company
      const employees: any[] = await UserModel.find({
        tenantId: company.tenantId,
        role: 'employee',
      }).select('-password');

      // Get skills for all employees
      const skillMap = new Map();
      try {
        for (const emp of employees) {
          const skills = await Skill.find({
            user_id: emp._id,
          });
          skillMap.set(emp._id.toString(), (skills || []).length);
        }
      } catch (skillError) {
        console.warn('Could not fetch skills:', skillError);
        // Continue without skills if there's an error
      }

      // Create workbook
      const workbook = new ExcelJS.Workbook();

      // Add Company Info Sheet
      const companySheet = workbook.addWorksheet('Company Info');
      companySheet.columns = [
        { header: 'Field', key: 'field', width: 20 },
        { header: 'Value', key: 'value', width: 40 },
      ];

      const companyData = [
        { field: 'Company Name', value: company.fullName || 'N/A' },
        { field: 'Email', value: company.email || 'N/A' },
        { field: 'Phone', value: company.phone || 'N/A' },
        { field: 'Industry', value: (company as any).industry || 'N/A' },
        { field: 'Website', value: (company as any).website || 'N/A' },
        { field: 'Country', value: (company as any).country || 'N/A' },
        { field: 'Status', value: company.isActive ? 'Active' : 'Inactive' },
        { field: 'Created Date', value: new Date((company as any).createdAt || new Date()).toLocaleDateString('en-US') },
        { field: 'Total Employees', value: employees.length },
      ];

      companySheet.addRows(companyData);

      // Add Employees Sheet
      const employeesSheet = workbook.addWorksheet('Employees');
      employeesSheet.columns = [
        { header: 'Employee Name', key: 'fullName', width: 20 },
        { header: 'Email', key: 'email', width: 25 },
        { header: 'Phone', key: 'phone', width: 15 },
        { header: 'Department', key: 'department', width: 15 },
        { header: 'Designation', key: 'designation', width: 15 },
        { header: 'Status', key: 'isActive', width: 10 },
        { header: 'Skills Count', key: 'skillsCount', width: 12 },
        { header: 'Joined Date', key: 'createdAt', width: 15 },
      ];

      const employeesData = employees.map((emp: any) => ({
        fullName: emp.fullName || 'N/A',
        email: emp.email || 'N/A',
        phone: emp.phone || 'N/A',
        department: emp.department || 'N/A',
        designation: emp.designationId || 'N/A',
        isActive: emp.isActive ? 'Active' : 'Inactive',
        skillsCount: skillMap.get(emp._id.toString()) || 0,
        createdAt: new Date(emp.createdAt).toLocaleDateString('en-US'),
      }));

      employeesSheet.addRows(employeesData);

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();
      return buffer;
    } catch (error) {
      console.error('Error exporting company data to Excel:', error);
      throw error;
    }
  },

  /**
   * Export company data to CSV
   * Includes company info and employees
   */
  exportCompanyDataCSV: async (companyId: string) => {
    try {
      const { Parser } = require('json2csv');
      const { Skill } = await import('../models/skill.model');

      // Get company details
      const company: any = await UserModel.findById(companyId).select('-password');
      if (!company || company.role !== 'company') {
        throw new Error('Company not found');
      }

      // Get all employees for this company
      const employees: any[] = await UserModel.find({
        tenantId: company.tenantId,
        role: 'employee',
      }).select('-password');

      // Get skills for all employees
      const skillMap = new Map();
      try {
        for (const emp of employees) {
          const skills = await Skill.find({
            user_id: emp._id,
          });
          skillMap.set(emp._id.toString(), (skills || []).length);
        }
      } catch (skillError) {
        console.warn('Could not fetch skills:', skillError);
        // Continue without skills if there's an error
      }

      // Prepare CSV data
      const csvData = employees.map((emp: any) => ({
        'Employee Name': emp.fullName || 'N/A',
        'Email': emp.email || 'N/A',
        'Phone': emp.phone || 'N/A',
        'Department': emp.department || 'N/A',
        'Designation': emp.designationId || 'N/A',
        'Status': emp.isActive ? 'Active' : 'Inactive',
        'Skills Count': skillMap.get(emp._id.toString()) || 0,
        'Joined Date': new Date(emp.createdAt).toLocaleDateString('en-US'),
      }));

      const parser = new Parser();
      const csv = parser.parse(csvData);
      return csv;
    } catch (error) {
      console.error('Error exporting company data to CSV:', error);
      throw error;
    }
  },
};
