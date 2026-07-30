import {
  Request,
  Response
} from 'express';

import { asyncHandler } from '../utils/async-handler';
import { SkillCategoryService } from '../services/skill-category.service';

class SkillCategoryController {

  private service =
    new SkillCategoryService();

  create = asyncHandler(
    async (
      req: Request,
      res: Response
    ) => {

      const userId = (req as any).user?.userId;
      const userRole = (req as any).user?.role;
      const companyId = (req as any).user?.organisationId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const category =
        await this.service.create(
          req.body,
          userId,
          userRole,
          userRole === "company" ? companyId : undefined
        );

      return res.status(201).json({
        success: true,
        data: category
      });

    }
  );

  getAll = asyncHandler(
    async (
      req: Request,
      res: Response
    ) => {
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 10;
      const search = req.query.search as string;
      const status = req.query.status as string;
      const createdType = req.query.createdType as string;

      const result =
        await this.service.getAll({
          page,
          limit,
          search,
          status,
          createdType,
        });

      return res.json({
        success: true,
        data: result
      });

    }
  );

  getById = asyncHandler(
    async (
      req: Request,
      res: Response
    ) => {

      const category =
        await this.service.getById(
          req.params.id as string
        );

      return res.json({
        success: true,
        data: category
      });

    }
  );

  update = asyncHandler(
    async (
      req: Request,
      res: Response
    ) => {

      const userRole = (req as any).user?.role;
      const companyId = (req as any).user?.organisationId;

      const category =
        await this.service.update(
          req.params.id as string,
          req.body,
          userRole,
          userRole === "company" ? companyId : undefined
        );

      return res.json({
        success: true,
        data: category
      });

    }
  );

  updateStatus = asyncHandler(
    async (
      req: Request,
      res: Response
    ) => {
      const { isActive } = req.body;
      const userRole = (req as any).user?.role;
      const companyId = (req as any).user?.organisationId;

      if (typeof isActive !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'isActive must be a boolean'
        });
      }

      const category =
        await this.service.updateStatus(
          req.params.id as string,
          isActive,
          userRole,
          userRole === "company" ? companyId : undefined
        );

      return res.json({
        success: true,
        data: category,
        message: `Category ${isActive ? 'activated' : 'deactivated'} successfully`
      });
    }
  );

  delete = asyncHandler(
    async (
      req: Request,
      res: Response
    ) => {

      const userRole = (req as any).user?.role;
      const companyId = (req as any).user?.organisationId;

      await this.service.delete(
        req.params.id as string,
        userRole,
        userRole === "company" ? companyId : undefined
      );

      return res.json({
        success: true,
        message:
          'Category deleted successfully'
      });

    }
  );

}

export default new SkillCategoryController();