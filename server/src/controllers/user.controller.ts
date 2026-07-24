import { Request, Response } from 'express';
import * as XLSX from 'xlsx';

import { userService } from '../services/user.service';
import * as AdminDashboardService from '../services/admin-dashboard.service';

import { sendResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { userRepository } from '../repositories/user.repository';

const parseCsvLine = (line: string): string[] => {
  const values: string[] = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (char === ',' && !insideQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
};

const parseCsvToObjects = (csv: string): Record<string, string>[] => {
  const lines = csv
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (lines.length === 0) {
    return [];
  }

  const headerRow = parseCsvLine(lines[0]);
  const headers = headerRow.map(header => header.trim().toLowerCase());

  return lines.slice(1).map(line => {
    const values = parseCsvLine(line);
    const obj: Record<string, string> = {};

    headers.forEach((header, index) => {
      obj[header] = (values[index] || '').trim();
    });

    return obj;
  });
};

export const getAllUsers = asyncHandler(
  async (req: Request, res: Response) => {

    const userRole = (req as any).user?.role;
    const userTenantId = (req as any).user?.tenantId;

    // Extract query parameters
    const { 
      page = 1, 
      limit = 20, 
      search, 
      company, 
      role, 
      status,
      sortBy = 'fullName',
      sortOrder = 'asc'
    } = req.query;

    // For admin users - return all users from all organizations
    if (userRole === 'admin') {
      const users =
        await userService.getAllUsersWithPagination({
          page: Number(page),
          limit: Number(limit),
          search: search as string,
          role: role as string,
          status: status as string,
          sortBy: sortBy as string,
          sortOrder: (sortOrder as string) === 'desc' ? 'desc' : 'asc'
        });

      return sendResponse(
        res,
        200,
        'Users fetched successfully',
        users
      );
    }

    // For company users - return only their employees
    if (userRole === 'company') {
      if (!userTenantId) {
        return sendResponse(
          res,
          400,
          'Tenant ID is required for company users',
          []
        );
      }

      const employees =
        await userService.getCompanyEmployeesWithPagination(userTenantId, {
          page: Number(page),
          limit: Number(limit),
          search: search as string,
          role: role as string,
          status: status as string,
          sortBy: sortBy as string,
          sortOrder: (sortOrder as string) === 'desc' ? 'desc' : 'asc'
        });

      return sendResponse(
        res,
        200,
        'Employees fetched successfully',
        employees
      );
    }

    return sendResponse(
      res,
      403,
      'Only admin and company users can access this resource',
      []
    );

  }
);

export const getUserById = asyncHandler(
  async (req: Request, res: Response) => {

    const userRole = (req as any).user?.role;
    const userTenantId = (req as any).user?.tenantId;

    const user = await userService.getUserById(
      req.params.id as string,
      {
        role: userRole,
        tenantId: userTenantId,
      }
    );

    return sendResponse(
      res,
      200,
      'User fetched successfully',
      user
    );

  }
);

export const setEmployeeStatus = asyncHandler(
  async (req: Request, res: Response) => {

    const userRole = (req as any).user?.role;
    const userTenantId = (req as any).user?.tenantId;
    const isActive = req.body.isActive;

    const user = await userService.setEmployeeActiveStatus(
      req.params.id as string,
      isActive,
      {
        role: userRole,
        tenantId: userTenantId,
      }
    );

    return sendResponse(
      res,
      200,
      `Employee has been ${isActive ? 'activated' : 'deactivated'} successfully`,
      user
    );

  }
);

export const impersonateEmployee = asyncHandler(
  async (req: Request, res: Response) => {

    const userRole = (req as any).user?.role;
    const userTenantId = (req as any).user?.tenantId;
    const employeeId = req.params.id as string;

    const result = await userService.impersonateUser(
      employeeId,
      {
        role: userRole,
        tenantId: userTenantId,
      }
    );

    return sendResponse(
      res,
      200,
      'Impersonation token generated successfully',
      result
    );

  }
);

export const createUser = asyncHandler(
  async (req: Request, res: Response) => {

    const adminId = (req as any).user?.userId;
    const adminName = (req as any).user?.fullName;

    const user =
      await userService.createUser(
        req.body,
        adminId,
        adminName
      );

    return sendResponse(
      res,
      201,
      'Company user created successfully and invitation email sent',
      user
    );

  }
);

export const updateUser = asyncHandler(
  async (req: Request, res: Response) => {

    const user =
      await userService.updateUser(
        req.params.id as string,
        req.body
      );

    return sendResponse(
      res,
      200,
      'User updated successfully',
      user
    );

  }
);

export const deleteUser = asyncHandler(
  async (req: Request, res: Response) => {

    await userService.deleteUser(
      req.params.id as string
    );

    return sendResponse(
      res,
      200,
      'User deleted successfully'
    );

  }
);

export const inviteUser = asyncHandler(
  async (req: Request, res: Response) => {

    // Get the inviter's details from the authenticated user
    const invitedByUserId = (req as any).user?.userId;

    const inviter = await userRepository.findById(invitedByUserId);
    const invitedByName = inviter?.fullName || 'Administrator';

    const result = await userService.inviteUser(
      req.body,
      invitedByUserId,
      invitedByName
    );

    return sendResponse(
      res,
      201,
      result.message,
      result.user
    );

  }
);

export const resetPassword = asyncHandler(
  async (req: Request, res: Response) => {

    // Get the resetter's name from the authenticated user
    const resetByName = (req as any).user?.fullName || 'Administrator';

    const result = await userService.resetUserPassword(
      req.params.id as string,
      resetByName
    );

    return sendResponse(
      res,
      200,
      result.message
    );

  }
);

export const activateUser = asyncHandler(
  async (req: Request, res: Response) => {

    const user = await userService.activateUser(
      req.params.id as string
    );

    return sendResponse(
      res,
      200,
      'User activated successfully',
      user
    );

  }
);

export const deactivateUser = asyncHandler(
  async (req: Request, res: Response) => {

    const user = await userService.deactivateUser(
      req.params.id as string
    );

    return sendResponse(
      res,
      200,
      'User deactivated successfully',
      user
    );

  }
);

export const impersonateUser = asyncHandler(
  async (req: Request, res: Response) => {

    const adminId = (req as any).user?.userId;
    const userRole = (req as any).user?.role;
    const userId = req.params.id as string;
    const userTenantId = (req as any).user?.tenantId;

    // Admin can impersonate any user, so we pass role info
    const result = await userService.impersonateUser(userId, {
      role: userRole,
      tenantId: undefined, // Admin doesn't need tenant restriction
    });

    return sendResponse(
      res,
      200,
      'Impersonation token generated successfully',
      result
    );

  }
);

export const impersonateCompanyUser = asyncHandler(
  async (req: Request, res: Response) => {

    const userRole = (req as any).user?.role;
    const companyUserId = req.params.id as string;

    const result = await userService.impersonateCompanyUser(companyUserId, {
      role: userRole,
    });

    return sendResponse(
      res,
      200,
      'Company user impersonation token generated successfully',
      result
    );

  }
);

export const getMyProfile = asyncHandler(
  async (req: Request, res: Response) => {

    const userId = (req as any).user?.userId;

    const user = await userService.getMyProfile(userId);

    return sendResponse(
      res,
      200,
      'Profile fetched successfully',
      user
    );

  }
);

export const updateMyProfile = asyncHandler(
  async (req: Request, res: Response) => {

    const userId = (req as any).user?.userId;
    const userFullName = (req as any).user?.fullName || '';
    const tenantId = (req as any).user?.tenantId;
    const organisationId = (req as any).user?.organisationId;

    const user = await userService.updateMyProfile(userId, req.body);

    await AdminDashboardService.createActivity(
      userId,
      userFullName,
      'Updated profile information',
      'profile',
      {
        changedFields: Object.keys(req.body || {}),
        tenantId,
        organisationId,
      }
    );

    return sendResponse(
      res,
      200,
      'Profile updated successfully',
      user
    );

  }
);

export const updateProfilePicture = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    const userFullName = (req as any).user?.fullName || '';
    const tenantId = (req as any).user?.tenantId;
    const organisationId = (req as any).user?.organisationId;

    if (!req.file) {
      throw new Error('No file uploaded');
    }

    const user = await userService.updateProfilePicture(userId, req.file.filename);

    await AdminDashboardService.createActivity(
      userId,
      userFullName,
      'Updated profile picture',
      'profile',
      {
        profileImage: user?.profileImage || null,
        tenantId,
        organisationId,
      }
    );

    return sendResponse(
      res,
      200,
      'Profile picture updated successfully',
      user
    );


  }
);

export const uploadUserProfilePicture = asyncHandler(
  async (req: Request, res: Response) => {

    const { id } = req.params;

    if (!req.file) {
      throw new Error('No file uploaded');
    }

    const user = await userService.updateProfilePicture(id as string, req.file.filename);

    return sendResponse(
      res,
      200,
      'Profile picture uploaded successfully',
      user
    );

  }
);

export const getEmployeesByCompany = asyncHandler(
  async (req: Request, res: Response) => {

    const employees = await userService.getEmployeesByCompany(
      req.params.companyId as string
    );

    return sendResponse(
      res,
      200,
      'Employees fetched successfully',
      employees
    );

  }
);

export const searchEmployees = asyncHandler(
  async (req: Request, res: Response) => {

    const userRole = (req as any).user?.role;
    const userTenantId = (req as any).user?.tenantId;

    const { search, skill, category, department, page, limit, sortKey, sortDirection, status, accountStatus, excludeAccountStatus } = req.query;

    const result = await userService.searchEmployees({
      search: search as string,
      skill: skill as string,
      category: category as string,
      department: department as string,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      sortKey: sortKey as string,
      sortDirection: sortDirection as string,
      status: status as string,
      accountStatus: accountStatus as string,
      excludeAccountStatus: excludeAccountStatus as string,
      userRole,
      userTenantId,
    });

    return sendResponse(
      res,
      200,
      'Employees search completed successfully',
      result
    );

  }
);

export const getEmployeeActivities = asyncHandler(
  async (req: Request, res: Response) => {
    const userRole = (req as any).user?.role;
    const userTenantId = (req as any).user?.tenantId;
    const employeeId = req.params.id as string;

    const { type, page, limit, status, search, dateRange, startDate, endDate } = req.query;

    const result = await userService.getEmployeeActivities({
      employeeId,
      type: type as string,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status: status as string,
      search: search as string,
      dateRange: dateRange as string,
      startDate: startDate as string,
      endDate: endDate as string,
      userRole,
      userTenantId,
    });

    return sendResponse(
      res,
      200,
      'Employee activities fetched successfully',
      result
    );
  }
);

export const getEmployeeLoginHistory = asyncHandler(
  async (req: Request, res: Response) => {
    const userRole = (req as any).user?.role;
    const userTenantId = (req as any).user?.tenantId;
    const employeeId = req.params.id as string;

    const { page, limit } = req.query;

    const result = await userService.getEmployeeLoginHistory({
      employeeId,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      userRole,
      userTenantId,
    });

    return sendResponse(
      res,
      200,
      'Employee login history fetched successfully',
      result
    );
  }
);

export const getCompanySkills = asyncHandler(
  async (req: Request, res: Response) => {

    const userTenantId = (req as any).user?.tenantId;

    const skills = await userService.getCompanySkills(userTenantId);

    return sendResponse(
      res,
      200,
      'Company skills fetched successfully',
      skills
    );

  }
);

export const getEmployeesBySkill = asyncHandler(
  async (req: Request, res: Response) => {

    const userTenantId = (req as any).user?.tenantId;
    const { skillName } = req.params;

    const employees = await userService.getEmployeesBySkill(
      skillName as string,
      userTenantId
    );

    return sendResponse(
      res,
      200,
      'Employees with skill fetched successfully',
      employees
    );

  }
);

export const getDepartments = asyncHandler(
  async (_req: Request, res: Response) => {
    const departments = await userService.getDepartments();
    return sendResponse(res, 200, 'Departments fetched successfully', departments);
  }
);

export const getTeams = asyncHandler(
  async (_req: Request, res: Response) => {
    const teams = await userService.getTeams();
    return sendResponse(res, 200, 'Teams fetched successfully', teams);
  }
);

export const getJobRoles = asyncHandler(
  async (_req: Request, res: Response) => {
    const jobRoles = await userService.getJobRoles();
    return sendResponse(res, 200, 'Job roles fetched successfully', jobRoles);
  }
);

export const exportEmployees = asyncHandler(
  async (req: Request, res: Response) => {
    const userRole = (req as any).user?.role;
    const userTenantId = (req as any).user?.tenantId;

    const { search, department, team, jobRole, status, accountStatus, excludeAccountStatus } = req.query;

    const employees = await userService.exportEmployees({
      search: search as string,
      department: department as string,
      team: team as string,
      jobRole: jobRole as string,
      status: status as string,
      accountStatus: accountStatus as string,
      excludeAccountStatus: excludeAccountStatus as string,
      userRole,
      userTenantId,
    });

    const headers = [
      'Full Name',
      'Email',
      'Department',
      'Team',
      'Job Role',
      'Status',
      'Account Status',
      'Organisation',
      'Tenant Name',
    ];

    const csvRows = employees.map((employee: any) => {
      const organisationName = employee.organisation?.organisationName || employee.organisationName || '';
      return [
        employee.fullName || '',
        employee.email || '',
        employee.department || '',
        employee.team || '',
        employee.title || '',
        employee.isActive ? 'Active' : 'Inactive',
        employee.accountStatus || '',
        organisationName,
        organisationName,
      ];
    });

    const csvContent = [headers, ...csvRows]
      .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="employees_export.csv"');
    res.status(200).send(csvContent);
  }
);

const parseImportFileToObjects = (file: Express.Multer.File): Record<string, string>[] => {
  const fileName = file.originalname.toLowerCase();

  if (fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) {
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      return [];
    }

    const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });

    return rawRows.map((row: Record<string, any>) => {
      const normalized: Record<string, string> = {};
      Object.entries(row).forEach(([key, value]) => {
        normalized[key.trim().toLowerCase()] = value?.toString?.().trim() || '';
      });
      return normalized;
    });
  }

  return parseCsvToObjects(file.buffer.toString('utf8'));
};

export const importEmployees = asyncHandler(
  async (req: Request, res: Response) => {
    const invitedByUserId = (req as any).user?.userId;
    const invitedByName = (req as any).user?.fullName || 'Company Administrator';

    if (!invitedByUserId) {
      throw new Error('Unable to identify inviting user');
    }

    if (!req.file || !req.file.buffer) {
      throw new Error('No import file uploaded');
    }

    const rows = parseImportFileToObjects(req.file as Express.Multer.File).map((row) => ({
      email: (row['email'] || row['email address'] || '').trim(),
      fullName: (row['full name'] || row['name'] || '').trim(),
      department: (row['department'] || '').trim(),
      team: (row['team'] || '').trim(),
      jobRole: (row['job role'] || row['title'] || row['role'] || '').trim(),
      message: (row['message'] || '').trim(),
    }));

    if (rows.length === 0) {
      return sendResponse(res, 400, 'The import file appears to be empty or invalid', {
        imported: 0,
        skipped: 0,
        errors: [],
      });
    }

    const result = await userService.importEmployees(rows, invitedByUserId, invitedByName);

    return sendResponse(
      res,
      200,
      'Employees imported successfully',
      result
    );
  }
);

export const getAllActivities = asyncHandler(
  async (req: Request, res: Response) => {

    const userRole = (req as any).user?.role;
    const userTenantId = (req as any).user?.tenantId;

    const { 
      page, 
      limit, 
      activityType, 
      employeeId, 
      status, 
      search, 
      dateRange, 
      startDate, 
      endDate 
    } = req.query;

    const result = await userService.getAllActivities({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      activityType: activityType as string,
      employeeId: employeeId as string,
      status: status as string,
      search: search as string,
      dateRange: dateRange as string,
      startDate: startDate as string,
      endDate: endDate as string,
      userRole,
      userTenantId,
    });

    return sendResponse(
      res,
      200,
      'Activities fetched successfully',
      result
    );

  }
);
