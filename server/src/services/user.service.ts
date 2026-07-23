// user.service.ts

import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { InviteUserDto } from '../dto/invite-user.dto';
import { UpdateProfileDto } from '../dto/update-profile.dto';

import { userRepository } from '../repositories/user.repository';
import { ActivityModel } from '../models/activity.model';

import { hashPassword, generateRandomPassword } from '../utils/password';
import { sendInvitationEmail, sendInvitationLinkEmail, sendPasswordResetNotificationEmail } from './email.service';
import { deleteOldProfileImage } from '../utils/file-upload';
import path from 'path';
import { AccountStatus } from '../types/common.types';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env';
import { assignOnboardingQuestionnaires } from './onboarding.service';
import * as AdminDashboardService from './admin-dashboard.service';
import { generateInvitationToken, generateToken } from '../utils/jwt';

export const userService = {

  getAllUsers: async (userRole?: string, userTenantId?: string) => {

    // Admin sees only companies (not employees or other admins)
    if (userRole === 'admin') {
      return await userRepository.findAll('company');
    } 
    // Company sees only their employees with same tenantId
    else if (userRole === 'company') {
      return await userRepository.findAll('employee', userTenantId);
    }
    
    // Default: return empty array for other roles
    return [];

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

    return await userRepository.getAllUsersWithPagination({
      page,
      limit,
      search,
      role,
      status,
      sortBy,
      sortOrder
    });
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
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }

    const {
      page = 1,
      limit = 20,
      search,
      role,
      status,
      sortBy = 'fullName',
      sortOrder = 'asc'
    } = params;

    return await userRepository.getCompanyEmployeesWithPagination(tenantId, {
      page,
      limit,
      search,
      role,
      status,
      sortBy,
      sortOrder
    });
  },

  getEmployeesByCompany: async (companyId: string) => {
    // Get company user to find tenantId
    const company = await userRepository.findById(companyId);
    
    if (!company) {
      throw new Error('Company not found');
    }

    if (company.role !== 'company') {
      throw new Error('User is not a company');
    }

    // Get all employees with the same tenantId
    return await userRepository.findAll('employee', company.tenantId);
  },

  searchEmployees: async (params: {
    search?: string;
    skill?: string;
    category?: string;
    department?: string;
    page?: number;
    limit?: number;
    sortKey?: string;
    sortDirection?: string;
    status?: string;
    accountStatus?: string;
    excludeAccountStatus?: string;
    userRole?: string;
    userTenantId?: string;
  }) => {
    const {
      search,
      skill,
      category,
      department,
      page,
      limit,
      sortKey,
      sortDirection,
      status,
      accountStatus,
      excludeAccountStatus,
      userRole,
      userTenantId,
    } = params;

    // Apply tenant filtering based on role
    let tenantId: string | undefined;

    if (userRole === 'company') {
      // Company users can only search employees in their own organization
      tenantId = userTenantId;
    }
    // Admin users can search across all organizations (tenantId remains undefined)

    // Call repository method with appropriate filters
    return await userRepository.searchEmployees({
      search,
      skill,
      category,
      department,
      tenantId,
      page,
      limit,
      sortKey,
      sortDirection,
      status,
      accountStatus,
      excludeAccountStatus,
    });
  },

  getEmployeeActivities: async (params: {
    employeeId: string;
    type?: string;
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    dateRange?: string;
    startDate?: string;
    endDate?: string;
    userRole?: string;
    userTenantId?: string;
  }) => {
    const {
      employeeId,
      type,
      page = 1,
      limit = 20,
      status,
      search,
      dateRange,
      startDate,
      endDate,
      userRole,
      userTenantId,
    } = params;

    return await userService.getAllActivities({
      employeeId,
      activityType: type,
      page,
      limit,
      status,
      search,
      dateRange,
      startDate,
      endDate,
      userRole,
      userTenantId,
    });
  },

  getEmployeeLoginHistory: async (params: {
    employeeId: string;
    page?: number;
    limit?: number;
    userRole?: string;
    userTenantId?: string;
  }) => {
    const {
      employeeId,
      page = 1,
      limit = 20,
      userRole,
      userTenantId,
    } = params;

    return await userService.getAllActivities({
      employeeId,
      activityType: 'login',
      page,
      limit,
      userRole,
      userTenantId,
    });
  },

  getDepartments: async () => {
    return await userRepository.getDistinctDepartments();
  },

  getTeams: async () => {
    return await userRepository.getDistinctTeams();
  },

  getJobRoles: async () => {
    return await userRepository.getDistinctJobRoles();
  },

  exportEmployees: async (params: {
    search?: string;
    department?: string;
    team?: string;
    jobRole?: string;
    status?: string;
    accountStatus?: string;
    excludeAccountStatus?: string;
    userRole?: string;
    userTenantId?: string;
  }) => {
    const {
      search,
      department,
      team,
      jobRole,
      status,
      accountStatus,
      excludeAccountStatus,
      userRole,
      userTenantId,
    } = params;

    const filter: any = {
      role: 'employee',
    };

    if (userRole === 'company') {
      filter.tenantId = userTenantId;
    }

    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    if (department) {
      filter.department = { $regex: department, $options: 'i' };
    }

    if (team) {
      filter.team = { $regex: team, $options: 'i' };
    }

    if (jobRole) {
      filter.title = { $regex: jobRole, $options: 'i' };
    }

    if (accountStatus) {
      filter.accountStatus = accountStatus;
    } else if (status) {
      filter.accountStatus = status;
    } else if (excludeAccountStatus) {
      filter.accountStatus = { $ne: excludeAccountStatus };
    }

    return await userRepository.exportEmployees(filter);
  },

  getUserById: async (id: string, actor?: { role?: string; tenantId?: string; userId?: string }) => {

    const user = await userRepository.findById(id);

    if (!user) {
      throw new Error('User not found');
    }

    if (actor?.role === 'company') {
      if (user.role !== 'employee') {
        throw new Error('Company users can only view employee profiles');
      }
      if (user.tenantId !== actor.tenantId) {
        throw new Error('Unauthorized to access this employee');
      }
    }

    return user;

  },

  setEmployeeActiveStatus: async (
    employeeId: string,
    isActive: boolean,
    actor: { role?: string; tenantId?: string }
  ) => {
    const employee = await userRepository.findById(employeeId);

    if (!employee) {
      throw new Error('Employee not found');
    }

    if (employee.role !== 'employee') {
      throw new Error('User is not an employee');
    }

    if (actor.role === 'company') {
      if (!actor.tenantId || employee.tenantId !== actor.tenantId) {
        throw new Error('Unauthorized to update this employee');
      }
    }

    const updatePayload: any = { isActive };

    if (!isActive) {
      updatePayload.accountStatus = 'inactive';
    } else if (employee.accountStatus !== 'invited') {
      updatePayload.accountStatus = 'active';
    }

    const updatedEmployee = await userRepository.update(employeeId, updatePayload);

    await AdminDashboardService.createActivity(
      employeeId,
      employee.fullName,
      `Employee account has been ${isActive ? 'activated' : 'deactivated'}`,
      'employee_status_change',
      {
        status: isActive ? 'active' : 'inactive',
        employeeId,
        tenantId: employee.tenantId,
        organisationId: employee.organisationId,
      }
    );

    return updatedEmployee;

  },

  impersonateUser: async (
    employeeId: string,
    actor: { role?: string; tenantId?: string }
  ) => {
    const employee = await userRepository.findById(employeeId);

    if (!employee) {
      throw new Error('Employee not found');
    }

    // Allow admin to impersonate any user
    if (actor.role === 'admin') {
      // Admin can impersonate anyone
    } else if (employee.role !== 'employee') {
      throw new Error('User is not an employee');
    }

    // For company users, verify tenant match
    if (actor.role === 'company') {
      if (!actor.tenantId || employee.tenantId !== actor.tenantId) {
        throw new Error('Unauthorized to impersonate this employee');
      }
    }

    if (!employee.isActive && actor.role !== 'admin') {
      throw new Error('Cannot impersonate an inactive employee');
    }

    if (employee.accountStatus === 'invited' && actor.role !== 'admin') {
      throw new Error('Employee must accept invitation before logging in');
    }

    const token = generateToken({
      userId: employee._id.toString(),
      email: employee.email,
      role: employee.role,
      tenantId: employee.tenantId,
      organisationId: employee.organisationId,
    });

    return {
      token,
      user: {
        _id: employee._id,
        fullName: employee.fullName,
        email: employee.email,
        role: employee.role,
        tenantId: employee.tenantId,
        organisationId: employee.organisationId,
      },
    };

  },

  createUser: async (
    payload: CreateUserDto,
    createdByUserId?: string,
    createdByName?: string
  ) => {
    const existingUser =
      await userRepository.findByEmail(
        payload.email
      );

    if (existingUser) {
      throw new Error(
        'User already exists'
      );
    }

    // Only admin can create company users
    if (payload.role !== 'company') {
      throw new Error(
        'Only company users can be created. Employees must be invited by their company administrator.'
      );
    }

    // Generate random password for company user
    const generatedPassword = generateRandomPassword();
    const hashedPassword = await hashPassword(generatedPassword);

    // Generate unique tenantId for the company
    const tenantId = uuidv4();

    // Fetch admin name if not provided
    let adminName = createdByName;
    if (!adminName && createdByUserId) {
      const admin = await userRepository.findById(createdByUserId);
      adminName = admin?.fullName || 'Administrator';
    }
    adminName = adminName || 'Administrator';

    // Create the company user
    const newUser = await userRepository.create({
      fullName: payload.fullName,
      email: payload.email,
      password: hashedPassword,
      role: 'company',
      tenantId: tenantId,
      profileCompleted: false,
      isActive: true,
      emailVerified: false,
      accountStatus: AccountStatus.INVITED,
      invitedAt: new Date(),
    });

    // Send invitation email with generated password
    await sendInvitationEmail(
      payload.email,
      generatedPassword,
      payload.fullName,
      adminName
    );

    return newUser;

  },

  updateUser: async (
    id: string,
    payload: UpdateUserDto
  ) => {

    const existingUser =
      await userRepository.findById(id);

    if (!existingUser) {
      throw new Error(
        'User not found'
      );
    }

    if (payload.email) {

      const emailExists =
        await userRepository.findByEmail(
          payload.email
        );

      if (
        emailExists &&
        emailExists._id.toString() !== id
      ) {

        throw new Error(
          'Email already exists'
        );

      }

    }

    return await userRepository.update(
      id,
      payload
    );

  },

  deleteUser: async (
    id: string,
    actor?: { role?: string; userId?: string; tenantId?: string; organisationId?: string }
  ) => {

    const existingUser =
      await userRepository.findById(id);

    if (!existingUser) {

      throw new Error(
        'User not found'
      );

    }

    if (actor?.role === 'company') {
      if (existingUser.role !== 'employee') {
        throw new Error('Company users can only delete employee accounts');
      }

      if (!actor.tenantId || existingUser.tenantId !== actor.tenantId) {
        throw new Error('You can only delete employees from your own company');
      }

      if (actor.organisationId && existingUser.organisationId && actor.organisationId !== existingUser.organisationId) {
        throw new Error('You can only delete employees from your own organisation');
      }
    } else if (actor?.role === 'employee') {
      throw new Error('Employees cannot delete users');
    }

    await userRepository.delete(id);

    return;

  },

  /**
   * Invite a new user with auto-generated password
   */
  inviteUser: async (
    payload: InviteUserDto,
    invitedByUserId: string,
    invitedByName: string
  ) => {

    // Check if user already exists
    const existingUser = await userRepository.findByEmail(payload.email);

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Get the inviter's details to inherit tenantId and organisationId
    const inviter = await userRepository.findById(invitedByUserId);

    if (!inviter) {
      throw new Error('Inviter user not found');
    }

    if (inviter.role !== 'company') {
      throw new Error('Only company users can invite employees');
    }

    if (!inviter.tenantId || !inviter.organisationId) {
      throw new Error('Company user must have tenantId and organisationId to invite employees');
    }

    const generatedPassword = generateRandomPassword();
    const hashedPassword = await hashPassword(generatedPassword);

    const fullName = payload.fullName?.trim() || payload.email.split('@')[0];

    const newUser = await userRepository.create({
      fullName,
      email: payload.email,
      password: hashedPassword,
      role: payload.role || 'employee',
      tenantId: inviter.tenantId,
      organisationId: inviter.organisationId,
      designationId: payload.designationId,
      profileCompleted: false,
      isActive: true,
      emailVerified: false, // Auto-verify invited users
      onboardingStatus: 'registered', // Skip onboarding for invited users
      accountStatus: AccountStatus.INVITED,
      invitedAt: new Date(),
      hasCompletedOnboarding: false,
    });

    // Auto-assign onboarding questionnaires to the new employee
    try {
      await assignOnboardingQuestionnaires(
        newUser._id.toString(),
        inviter.tenantId,
        inviter.organisationId,
        invitedByUserId
      );
    } catch (error) {
      console.error('Failed to assign onboarding questionnaires:', error);
      // Don't fail the invitation if questionnaire assignment fails
    }

    const inviteToken = generateInvitationToken({
      userId: newUser._id,
      email: newUser.email,
      role: payload.role || 'employee',
      tenantId: inviter.tenantId,
      organisationId: inviter.organisationId,
      invitedByUserId,
      purpose: 'invitation',
    });

    const inviteLink = `${env.CLIENT_URL || 'http://localhost:4200'}/auth/invite-signup?token=${encodeURIComponent(inviteToken)}`;

    await sendInvitationLinkEmail(
      payload.email,
      fullName,
      invitedByName,
      inviteLink,
      payload.message
    );

    return {
      user: newUser,
      message: 'Invitation sent successfully. The recipient can complete signup using the secure invitation link.',
    };

  },

  importEmployees: async (
    rows: Array<{ email: string; fullName?: string; department?: string; team?: string; jobRole?: string; message?: string }>,
    invitedByUserId: string,
    invitedByName: string
  ) => {
    const inviter = await userRepository.findById(invitedByUserId);

    if (!inviter) {
      throw new Error('Inviter user not found');
    }

    if (inviter.role !== 'company') {
      throw new Error('Only company users can import employees');
    }

    if (!inviter.tenantId || !inviter.organisationId) {
      throw new Error('Company user must have tenantId and organisationId to import employees');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const result = {
      imported: 0,
      skipped: 0,
      existingEmails: [] as string[],
      invalidRows: [] as { row: any; reason: string }[],
      errors: [] as { email?: string; reason: string }[],
    };

    for (const row of rows) {
      const email = (row.email || '').trim().toLowerCase();
      const fullName = row.fullName?.trim() || email.split('@')[0];

      if (!email || !emailRegex.test(email)) {
        result.invalidRows.push({ row, reason: 'Invalid or missing email address' });
        continue;
      }

      const existingUser = await userRepository.findByEmail(email);
      if (existingUser) {
        result.skipped += 1;
        result.existingEmails.push(email);
        continue;
      }

      try {
        const generatedPassword = generateRandomPassword();
        const hashedPassword = await hashPassword(generatedPassword);

        const newUser = await userRepository.create({
          fullName,
          email,
          password: hashedPassword,
          role: 'employee',
          tenantId: inviter.tenantId,
          organisationId: inviter.organisationId,
          department: row.department?.trim() || undefined,
          team: row.team?.trim() || undefined,
          title: row.jobRole?.trim() || undefined,
          profileCompleted: false,
          isActive: true,
          emailVerified: false,
          onboardingStatus: 'registered',
          accountStatus: AccountStatus.INVITED,
          invitedAt: new Date(),
          hasCompletedOnboarding: false,
        });

        try {
          await assignOnboardingQuestionnaires(
            newUser._id.toString(),
            inviter.tenantId,
            inviter.organisationId,
            invitedByUserId
          );
        } catch (error) {
          console.error('Failed to assign onboarding questionnaires:', error);
        }

        const inviteToken = generateInvitationToken({
          userId: newUser._id,
          email: newUser.email,
          role: 'employee',
          tenantId: inviter.tenantId,
          organisationId: inviter.organisationId,
          invitedByUserId,
          purpose: 'invitation',
        });

        const inviteLink = `${env.CLIENT_URL || 'http://localhost:4200'}/auth/invite-signup?token=${encodeURIComponent(inviteToken)}`;

        await sendInvitationLinkEmail(
          email,
          fullName,
          invitedByName,
          inviteLink,
          row.message?.trim()
        );

        result.imported += 1;
      } catch (error: any) {
        result.errors.push({
          email,
          reason: error?.message || 'Failed to import employee',
        });
      }
    }

    return {
      ...result,
      message: `${result.imported} employee(s) imported successfully. ${result.skipped} existing email(s) were skipped.`,
    };
  },

  /**
   * Reset user password and send notification email
   */
  resetUserPassword: async (
    userId: string,
    resetByName: string
  ) => {

    // Find the user
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Generate new random password
    const newPassword = generateRandomPassword();

    // Hash the new password
    const hashedPassword = await hashPassword(newPassword);

    // Update user password
    await userRepository.update(userId, {
      password: hashedPassword,
    });

    // Send password reset notification email
    await sendPasswordResetNotificationEmail(
      user.email,
      newPassword,
      user.fullName,
      resetByName
    );

    return {
      message: 'Password reset successfully and email sent',
    };

  },

  /**
   * Get current user profile
   */
  getMyProfile: async (userId: string) => {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  },

  /**
   * Update current user profile
   */
  updateMyProfile: async (
    userId: string,
    payload: UpdateProfileDto
  ) => {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    const updatedUser = await userRepository.update(userId, payload);

    return updatedUser;
  },

  /**
   * Update user profile picture
   */
  updateProfilePicture: async (
    userId: string,
    filename: string
  ) => {
    const user = await userRepository.findById(userId);

    if (!user) {
      // Delete the uploaded file since user doesn't exist
      const uploadedFilePath = path.join(__dirname, '../../uploads/profiles', filename);
      deleteOldProfileImage(uploadedFilePath);
      throw new Error('User not found');
    }

    // Store old image path for cleanup
    const oldImagePath = user.profileImage 
      ? path.join(__dirname, '../../uploads/profiles', path.basename(user.profileImage))
      : null;

    // Update profile image in database
    const profileImageUrl = `/uploads/profiles/${filename}`;
    
    try {
      const updatedUser = await userRepository.update(userId, {
        profileImage: profileImageUrl,
      });

      // Delete old profile image only after successful database update
      if (oldImagePath) {
        deleteOldProfileImage(oldImagePath);
      }

      return updatedUser;
    } catch (error) {
      // If database update fails, delete the newly uploaded file
      const uploadedFilePath = path.join(__dirname, '../../uploads/profiles', filename);
      deleteOldProfileImage(uploadedFilePath);
      throw error;
    }
  },

  /**
   * Get all skills in company with employee counts
   */
  getCompanySkills: async (userTenantId?: string) => {
    if (!userTenantId) {
      throw new Error('Tenant ID is required');
    }

    return await userRepository.getCompanySkills(userTenantId);
  },

  /**
   * Get employees who have a specific skill
   */
  getEmployeesBySkill: async (skillName: string, userTenantId?: string) => {
    if (!userTenantId) {
      throw new Error('Tenant ID is required');
    }

    if (!skillName) {
      throw new Error('Skill name is required');
    }

    return await userRepository.getEmployeesBySkill(skillName, userTenantId);
  },

  /**
   * Activate a user
   */
  activateUser: async (userId: string) => {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    const updatedUser = await userRepository.update(userId, {
      isActive: true,
      accountStatus: AccountStatus.ACTIVE,
    });

    return updatedUser;
  },

  /**
   * Deactivate a user
   */
  deactivateUser: async (userId: string) => {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    const updatedUser = await userRepository.update(userId, {
      isActive: false,
      accountStatus: AccountStatus.SUSPENDED,
    });

    return updatedUser;
  },

  /**
   * Get all employee activities with pagination and filters
   */
  getAllActivities: async (params: {
    page?: number;
    limit?: number;
    activityType?: string;
    employeeId?: string;
    status?: string;
    search?: string;
    dateRange?: string;
    startDate?: string;
    endDate?: string;
    userRole?: string;
    userTenantId?: string;
  }) => {
    const {
      page = 1,
      limit = 20,
      activityType,
      employeeId,
      status,
      search,
      dateRange,
      startDate,
      endDate,
      userRole,
      userTenantId,
    } = params;

    const filter: any = {};

    if (userRole === 'company') {
      filter.tenantId = userTenantId;
    }

    if (activityType) {
      filter.type = activityType;
    }

    if (employeeId) {
      filter.userId = employeeId;
    }

    if (status) {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { user: { $regex: search, $options: 'i' } },
        { activity: { $regex: search, $options: 'i' } },
      ];
    }

    if (startDate || endDate || dateRange) {
      const createdAtFilter: any = {};
      const now = new Date();

      if (dateRange === 'today') {
        createdAtFilter.$gte = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (dateRange === 'week') {
        createdAtFilter.$gte = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (dateRange === 'month') {
        createdAtFilter.$gte = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (dateRange === 'year') {
        createdAtFilter.$gte = new Date(now.getFullYear(), 0, 1);
      }

      if (startDate) {
        const start = new Date(startDate);
        if (!createdAtFilter.$gte || start > createdAtFilter.$gte) {
          createdAtFilter.$gte = start;
        }
      }
      if (endDate) {
        createdAtFilter.$lte = new Date(endDate);
      }

      if (Object.keys(createdAtFilter).length > 0) {
        filter.createdAt = createdAtFilter;
      }
    }

    let activities = [] as any[];
    let total = 0;

    if (userRole === 'company') {
      const lookupPipeline: any[] = [
        { $match: filter },
        {
          $lookup: {
            from: 'users',
            let: { activityUserId: '$userId' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: [{ $toString: '$_id' }, '$$activityUserId'] },
                      { $eq: ['$role', 'employee'] },
                    ],
                  },
                },
              },
            ],
            as: 'user',
          },
        },
        { $unwind: '$user' },
      ];

      const countResult = await ActivityModel.aggregate([
        ...lookupPipeline,
        { $count: 'count' },
      ]);
      total = countResult[0]?.count || 0;

      activities = await ActivityModel.aggregate([
        ...lookupPipeline,
        { $sort: { createdAt: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
      ]);
    } else {
      total = await ActivityModel.countDocuments(filter);
      activities = await ActivityModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();
    }

    return {
      activities: activities.map(activity => ({
        _id: activity._id,
        employeeId: activity.userId,
        employeeName: activity.user?.fullName || activity.user || 'Employee',
        activityType: activity.type,
        description: activity.activity,
        status: activity.status || activity.details?.status || 'completed',
        timestamp: activity.createdAt,
        details: activity.details,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

};