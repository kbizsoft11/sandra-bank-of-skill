import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { asyncHandler } from '../utils/async-handler';
import { sendResponse } from '../utils/api-response';
import { CompanySkillCategoryService } from '../services/company-skill-category.service';
import { ApiError } from '../utils/api-error';

class CompanySkillCategoryController {
  private service = new CompanySkillCategoryService();

  private getCompanyId(req: Request) {
    const companyId = (req as any).user?.organisationId || (req as any).user?.userId;

    if (!companyId) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Company identifier not found.'
      );
    }

    return companyId as string;
  }

  create = asyncHandler(async (req: Request, res: Response) => {
    const companyId = this.getCompanyId(req);

    const mapping = await this.service.create(companyId, req.body);

    return sendResponse(
      res,
      StatusCodes.CREATED,
      'Company skill category mapping created successfully.',
      mapping
    );
  });

  getAll = asyncHandler(async (req: Request, res: Response) => {
    const companyId = this.getCompanyId(req);

    const categories = await this.service.getCompanyCategories(companyId);

    return sendResponse(
      res,
      StatusCodes.OK,
      'Company skill categories fetched successfully.',
      categories
    );
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const companyId = this.getCompanyId(req);

    const mapping = await this.service.update(
      req.params.id as string,
      companyId,
      req.body
    );

    return sendResponse(
      res,
      StatusCodes.OK,
      'Company skill category mapping updated successfully.',
      mapping
    );
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    const companyId = this.getCompanyId(req);

    await this.service.delete(req.params.id as string, companyId);

    return sendResponse(
      res,
      StatusCodes.OK,
      'Company skill category mapping deleted successfully.'
    );
  });

  getAvailableAdminCategories = asyncHandler(async (req: Request, res: Response) => {
    const companyId = this.getCompanyId(req);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';

    const result = await this.service.getAvailableAdminCategoriesForCompany(
      companyId,
      page,
      limit,
      search
    );

    return sendResponse(
      res,
      StatusCodes.OK,
      'Available admin categories fetched successfully.',
      result
    );
  });
}

export default new CompanySkillCategoryController();
