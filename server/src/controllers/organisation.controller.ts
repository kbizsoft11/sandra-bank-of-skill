// organisation.controller.ts

import { Request, Response } from 'express';
import { organisationService } from '../services/organisation.service';
import { sendResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { userService } from '../services/user.service';
import { userRepository } from '../repositories/user.repository';

// ======================== COMPANY PORTAL ROUTES ========================

/**
 * Get my organisation (for company portal)
 * Company users only
 */
export const getMyOrganisation = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    const organisationId = (req as any).user?.organisationId;

    if (!organisationId) {
      return sendResponse(
        res,
        404,
        'Organisation not found'
      );
    }

    // Fetch organisation (would need an Organisation repository)
    // For now, return the user's organisation context
    const user = await userRepository.findById(userId);

    return sendResponse(
      res,
      200,
      'Organisation fetched successfully',
      user
    );
  }
);

/**
 * Get organisation by ID (for company portal)
 * Company users can view their own organisation
 */
export const getOrganisationById = asyncHandler(
  async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const userTenantId = (req as any).user?.tenantId;
    const userRole = (req as any).user?.role;

    const user = await userRepository.findById(id);

    if (!user) {
      return sendResponse(res, 404, 'Organisation not found');
    }

    // Company users can only view their own organisation
    if (userRole === 'company' && user.tenantId !== userTenantId) {
      return sendResponse(res, 403, 'Access denied');
    }

    return sendResponse(
      res,
      200,
      'Organisation fetched successfully',
      user
    );
  }
);

/**
 * Update my organisation (for company portal)
 * Company users only
 */
export const updateMyOrganisation = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;

    const user = await userService.updateMyProfile(userId, req.body);

    return sendResponse(
      res,
      200,
      'Organisation updated successfully',
      user
    );
  }
);

// ======================== ADMIN ROUTES ========================

/**
 * Get all companies (admin only)
 * Supports search and status filtering
 */
export const getAllCompanies = asyncHandler(
  async (req: Request, res: Response) => {
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const search = req.query.search as string;
    const status = req.query.status as string;

    const result = await organisationService.getAllCompanies(page, limit, {
      search,
      status,
    });

    return sendResponse(
      res,
      200,
      'Companies fetched successfully',
      result
    );
  }
);

/**
 * Get company details (admin only)
 * Returns company info and statistics
 */
export const getCompanyDetails = asyncHandler(
  async (req: Request, res: Response) => {
    const companyId = req.params.companyId as string;

    const company = await organisationService.getCompanyDetails(companyId);

    if (!company) {
      return sendResponse(res, 404, 'Company not found');
    }

    return sendResponse(
      res,
      200,
      'Company details fetched successfully',
      company
    );
  }
);

/**
 * Get employees of an organization (admin only)
 * Supports search and status filtering
 */
export const getOrganisationEmployees = asyncHandler(
  async (req: Request, res: Response) => {
    const organisationId = req.params.organisationId as string;
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const search = req.query.search as string;
    const status = req.query.status as string;

    const result = await organisationService.getEmployeesByOrganisation(
      organisationId,
      page,
      limit,
      { search, status }
    );

    return sendResponse(
      res,
      200,
      'Organisation employees fetched successfully',
      result
    );
  }
);

/**
 * Get employee skills (admin only)
 * Returns read-only skills for a specific employee
 */
export const getEmployeeSkills = asyncHandler(
  async (req: Request, res: Response) => {
    const employeeId = req.params.employeeId as string;

    const skills = await organisationService.getEmployeeSkills(employeeId);

    return sendResponse(
      res,
      200,
      'Employee skills fetched successfully',
      skills
    );
  }
);

/**
 * Update company status (activate/deactivate)
 * Admin only
 */
export const updateCompanyStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const companyId = req.params.companyId as string;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return sendResponse(res, 400, 'isActive must be a boolean');
    }

    const company = await organisationService.updateCompanyStatus(
      companyId,
      isActive
    );

    return sendResponse(
      res,
      200,
      `Company ${isActive ? 'activated' : 'deactivated'} successfully`,
      company
    );
  }
);

/**
 * Create a new company
 * Admin only
 */
export const createCompany = asyncHandler(
  async (req: Request, res: Response) => {
    const company = await organisationService.createCompany(req.body);

    return sendResponse(
      res,
      201,
      'Company created successfully',
      company
    );
  }
);

/**
 * Update company details
 * Admin only
 */
export const updateCompany = asyncHandler(
  async (req: Request, res: Response) => {
    const companyId = req.params.companyId as string;

    const company = await organisationService.updateCompany(companyId, req.body);

    return sendResponse(
      res,
      200,
      'Company updated successfully',
      company
    );
  }
);

/**
 * Get employee details (admin only)
 * Returns employee profile information
 */
export const getEmployeeDetails = asyncHandler(
  async (req: Request, res: Response) => {
    const employeeId = req.params.employeeId as string;

    const employee = await organisationService.getEmployeeDetails(employeeId);

    return sendResponse(
      res,
      200,
      'Employee details fetched successfully',
      employee
    );
  }
);

/**
 * Get employee assessments (admin only)
 * Returns assessments for a specific employee
 */
export const getEmployeeAssessments = asyncHandler(
  async (req: Request, res: Response) => {
    const employeeId = req.params.employeeId as string;

    const assessments = await organisationService.getEmployeeAssessments(employeeId);

    return sendResponse(
      res,
      200,
      'Employee assessments fetched successfully',
      assessments
    );
  }
);

/**
 * Get employee activity (admin only)
 * Returns activity log for a specific employee
 */
export const getEmployeeActivity = asyncHandler(
  async (req: Request, res: Response) => {
    const employeeId = req.params.employeeId as string;

    const activity = await organisationService.getEmployeeActivity(employeeId);

    return sendResponse(
      res,
      200,
      'Employee activity fetched successfully',
      activity
    );
  }
);

/**
 * Export company data to Excel (admin only)
 * Includes company info, employees, and skills
 */
export const exportCompanyDataExcel = asyncHandler(
  async (req: Request, res: Response) => {
    const companyId = req.params.companyId as string;

    const buffer = await organisationService.exportCompanyDataExcel(companyId);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="company-data-${companyId}.xlsx"`);
    res.send(buffer);
  }
);

/**
 * Export company data to CSV (admin only)
 * Includes company info and employees
 */
export const exportCompanyDataCSV = asyncHandler(
  async (req: Request, res: Response) => {
    const companyId = req.params.companyId as string;

    const csv = await organisationService.exportCompanyDataCSV(companyId);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="company-data-${companyId}.csv"`);
    res.send(csv);
  }
);

/**
 * Export organisation employees to Excel
 * Admin only
 */
export const exportEmployeesToExcel = asyncHandler(
  async (req: Request, res: Response) => {
    const organisationId = req.params.organisationId as string;
    const search = req.query.search as string;
    const status = req.query.status as string;

    const data = await organisationService.exportEmployeesToExcel(organisationId, {
      search,
      status,
    });

    // Convert to Excel format using xlsx
    const XLSX = require('xlsx');
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 20 }, // Employee Name
      { wch: 24 }, // Employee ID
      { wch: 25 }, // Email
      { wch: 15 }, // Department
      { wch: 15 }, // Designation
      { wch: 15 }, // Phone
      { wch: 12 }, // Skills Count
      { wch: 12 }, // Status
      { wch: 15 }, // Joined Date
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees');
    
    // Generate buffer
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    // Set response headers
    const timestamp = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="employees-${timestamp}.xlsx"`);
    
    return res.send(buffer);
  }
);

/**
 * Export organisation employees to CSV
 * Admin only
 */
export const exportEmployeesToCSV = asyncHandler(
  async (req: Request, res: Response) => {
    const organisationId = req.params.organisationId as string;
    const search = req.query.search as string;
    const status = req.query.status as string;

    const data = await organisationService.exportEmployeesToCSV(organisationId, {
      search,
      status,
    });

    // Convert to CSV format
    if (data.length === 0) {
      const csv = 'No employees found';
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="employees.csv"');
      return res.send(csv);
    }

    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');
    
    const csvRows = data.map((row: any) =>
      headers.map(header => {
        const value = row[header];
        // Escape quotes and wrap in quotes if contains comma
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    );

    const csv = [csvHeaders, ...csvRows].join('\n');

    // Set response headers
    const timestamp = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="employees-${timestamp}.csv"`);
    
    return res.send(csv);
  }
);

/**
 * Create an employee for a specific organisation
 * Admin only
 */
export const createEmployeeForOrganisation = asyncHandler(
  async (req: Request, res: Response) => {
    const organisationId = req.params.organisationId as string;

    const employee = await organisationService.createEmployeeForOrganisation(
      organisationId,
      req.body
    );

    return sendResponse(
      res,
      201,
      'Employee created successfully',
      employee
    );
  }
);

/**
 * Update an employee for a specific organisation
 * Admin only
 */
export const updateEmployeeForOrganisation = asyncHandler(
  async (req: Request, res: Response) => {
    const organisationId = req.params.organisationId as string;
    const employeeId = req.params.employeeId as string;

    const employee = await organisationService.updateEmployeeForOrganisation(
      organisationId,
      employeeId,
      req.body
    );

    return sendResponse(
      res,
      200,
      'Employee updated successfully',
      employee
    );
  }
);
