import { CompanyCategory, ICompanyCategory } from "../models/companyCategory.model";
import { CreateCompanyCategoryDto, UpdateCompanyCategoryDto, GetCompanyCategoriesQueryDto } from "../dto/companyCategory.dto";
import { Schema } from "mongoose";

export class CompanyCategoryRepository {
  /**
   * Create company category mapping
   */
  async create(data: CreateCompanyCategoryDto & { companyId: Schema.Types.ObjectId }): Promise<ICompanyCategory> {
    const mapping = new CompanyCategory(data);
    return mapping.save();
  }

  /**
   * Find company category mapping by ID
   */
  async findById(id: string): Promise<ICompanyCategory | null> {
    return CompanyCategory.findById(id)
      .populate("categoryId", "name description createdType")
      .exec();
  }

  /**
   * Find mapping by company and category
   */
  async findByCompanyAndCategory(companyId: string, categoryId: string): Promise<ICompanyCategory | null> {
    return CompanyCategory.findOne({ companyId, categoryId })
      .populate("categoryId", "name description")
      .exec();
  }

  /**
   * Get all categories for a company
   */
  async findByCompany(companyId: string, query: GetCompanyCategoriesQueryDto = {}): Promise<{ categories: ICompanyCategory[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 10, enabled, createdType, search } = query;

    const filter: any = { companyId };

    if (enabled !== undefined) {
      filter.enabled = enabled;
    }

    const skip = (Number(page) - 1) * Number(limit);

    // Build pipeline for aggregation with search
    let categories: ICompanyCategory[];
    let total: number;

    if (search || createdType) {
      // Use aggregation for complex filtering
      const pipeline: any = [
        { $match: filter },
        {
          $lookup: {
            from: "skillcategories",
            localField: "categoryId",
            foreignField: "_id",
            as: "category",
          },
        },
        { $unwind: "$category" },
      ];

      if (search) {
        pipeline.push({
          $match: {
            "category.name": { $regex: search, $options: "i" },
          },
        });
      }

      if (createdType) {
        pipeline.push({
          $match: {
            "category.createdType": createdType,
          },
        });
      }

      const countPipeline = [...pipeline, { $count: "total" }];
      total = (await CompanyCategory.aggregate(countPipeline))[0]?.total || 0;

      pipeline.push(
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: Number(limit) }
      );

      const results = await CompanyCategory.aggregate(pipeline);
      categories = results.map((r: any) => ({
        _id: r._id,
        companyId: r.companyId,
        categoryId: r.categoryId,
        enabled: r.enabled,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        category: r.category, // Include populated category
      })) as ICompanyCategory[];
    } else {
      [categories, total] = await Promise.all([
        CompanyCategory.find(filter)
          .populate("categoryId", "name description createdType status")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(Number(limit))
          .exec(),
        CompanyCategory.countDocuments(filter),
      ]);
    }

    return {
      categories,
      total,
      page: Number(page),
      limit: Number(limit),
    };
  }

  /**
   * Get enabled categories for a company
   */
  async findEnabledByCompany(companyId: string): Promise<ICompanyCategory[]> {
    return CompanyCategory.find({ companyId, enabled: true })
      .populate("categoryId", "name description")
      .exec();
  }

  /**
   * Update company category mapping
   */
  async update(id: string, data: UpdateCompanyCategoryDto): Promise<ICompanyCategory | null> {
    return CompanyCategory.findByIdAndUpdate(id, data, { new: true })
      .populate("categoryId", "name description")
      .exec();
  }

  /**
   * Delete company category mapping
   */
  async delete(id: string): Promise<boolean> {
    const result = await CompanyCategory.findByIdAndDelete(id).exec();
    return result !== null;
  }

  /**
   * Delete all mappings for a company
   */
  async deleteByCompany(companyId: string): Promise<number> {
    const result = await CompanyCategory.deleteMany({ companyId }).exec();
    return result.deletedCount || 0;
  }

  /**
   * Check if mapping exists
   */
  async exists(companyId: string, categoryId: string): Promise<boolean> {
    const count = await CompanyCategory.countDocuments({ companyId, categoryId });
    return count > 0;
  }

  /**
   * Bulk enable categories for company
   */
  async bulkEnable(companyId: string, categoryIds: string[]): Promise<number> {
    const result = await CompanyCategory.updateMany(
      { companyId, categoryId: { $in: categoryIds } },
      { enabled: true }
    ).exec();
    return result.modifiedCount || 0;
  }

  /**
   * Bulk disable categories for company
   */
  async bulkDisable(companyId: string, categoryIds: string[]): Promise<number> {
    const result = await CompanyCategory.updateMany(
      { companyId, categoryId: { $in: categoryIds } },
      { enabled: false }
    ).exec();
    return result.modifiedCount || 0;
  }
}

export default new CompanyCategoryRepository();
