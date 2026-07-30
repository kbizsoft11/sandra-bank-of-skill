import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import companyCategoryService from "../services/companyCategory.service";
import { asyncHandler } from "../utils/async-handler";
import { sendResponse } from "../utils/api-response";
import { ApiError } from "../utils/api-error";

class CompanyCategoryController {
  /**
   * Add category to company
   * POST /api/company-categories
   */
  create = asyncHandler(async (req: Request, res: Response) => {
    const companyId = (req as any).user?.organisationId;

    if (!companyId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "Company ID not found");
    }

    const mapping = await companyCategoryService.addCategory(req.body, companyId);

    return sendResponse(
      res,
      StatusCodes.CREATED,
      "Category added to company successfully",
      mapping
    );
  });

  /**
   * Get all categories for company
   * GET /api/company-categories
   */
  getAll = asyncHandler(async (req: Request, res: Response) => {
    const companyId = (req as any).user?.organisationId;

    if (!companyId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "Company ID not found");
    }

    const result = await companyCategoryService.getByCompany(companyId, req.query as any);

    return sendResponse(
      res,
      StatusCodes.OK,
      "Company categories fetched successfully",
      result
    );
  });

  /**
   * Get enabled categories for company
   * GET /api/company-categories/enabled
   */
  getEnabled = asyncHandler(async (req: Request, res: Response) => {
    const companyId = (req as any).user?.organisationId;

    if (!companyId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "Company ID not found");
    }

    const categories = await companyCategoryService.getEnabledByCompany(companyId);

    return sendResponse(
      res,
      StatusCodes.OK,
      "Enabled categories fetched successfully",
      categories
    );
  });

  /**
   * Get company category by ID
   * GET /api/company-categories/:id
   */
  getById = asyncHandler(async (req: Request, res: Response) => {
    const mapping = await companyCategoryService.getById(req.params.id);

    return sendResponse(
      res,
      StatusCodes.OK,
      "Company category fetched successfully",
      mapping
    );
  });

  /**
   * Update company category
   * PATCH /api/company-categories/:id
   */
  update = asyncHandler(async (req: Request, res: Response) => {
    const mapping = await companyCategoryService.update(req.params.id, req.body);

    return sendResponse(
      res,
      StatusCodes.OK,
      "Company category updated successfully",
      mapping
    );
  });

  /**
   * Enable category for company
   * PATCH /api/company-categories/:id/enable
   */
  enable = asyncHandler(async (req: Request, res: Response) => {
    const mapping = await companyCategoryService.enable(req.params.id);

    return sendResponse(
      res,
      StatusCodes.OK,
      "Category enabled successfully",
      mapping
    );
  });

  /**
   * Disable category for company
   * PATCH /api/company-categories/:id/disable
   */
  disable = asyncHandler(async (req: Request, res: Response) => {
    const mapping = await companyCategoryService.disable(req.params.id);

    return sendResponse(
      res,
      StatusCodes.OK,
      "Category disabled successfully",
      mapping
    );
  });

  /**
   * Remove category from company
   * DELETE /api/company-categories/:id
   */
  delete = asyncHandler(async (req: Request, res: Response) => {
    const result = await companyCategoryService.remove(req.params.id);

    return sendResponse(
      res,
      StatusCodes.OK,
      result.message,
      null
    );
  });

  /**
   * Bulk enable categories
   * POST /api/company-categories/bulk/enable
   */
  bulkEnable = asyncHandler(async (req: Request, res: Response) => {
    const companyId = (req as any).user?.organisationId;
    const { categoryIds } = req.body;

    if (!companyId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "Company ID not found");
    }

    const result = await companyCategoryService.bulkEnable(companyId, categoryIds);

    return sendResponse(
      res,
      StatusCodes.OK,
      result.message,
      result
    );
  });

  /**
   * Bulk disable categories
   * POST /api/company-categories/bulk/disable
   */
  bulkDisable = asyncHandler(async (req: Request, res: Response) => {
    const companyId = (req as any).user?.organisationId;
    const { categoryIds } = req.body;

    if (!companyId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "Company ID not found");
    }

    const result = await companyCategoryService.bulkDisable(companyId, categoryIds);

    return sendResponse(
      res,
      StatusCodes.OK,
      result.message,
      result
    );
  });
}

export default new CompanyCategoryController();
