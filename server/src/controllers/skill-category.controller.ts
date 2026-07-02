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

      const category =
        await this.service.create(
          req.body
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

      const categories =
        await this.service.getAll();

      return res.json({
        success: true,
        data: categories
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

      const category =
        await this.service.update(
          req.params.id as string,
          req.body
        );

      return res.json({
        success: true,
        data: category
      });

    }
  );

  delete = asyncHandler(
    async (
      req: Request,
      res: Response
    ) => {

      await this.service.delete(
        req.params.id as string
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