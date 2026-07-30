import { StatusCodes } from "http-status-codes";
import { ApiError } from "../utils/api-error";
import companyCategoryRepository from "../repositories/companyCategory.repository";
import skillCategoryRepository from "../repositories/skillCategory.repository";
import { CreateCompanyCategoryDto, UpdateCompanyCategoryDto, GetCompanyCategoriesQueryDto } from "../dto/companyCategory.dto";
import { Schema } from "mongoose";

class CompanyCategoryService {
  /**
   * Add admin category to company
   */
  async addCategory(data: CreateCompanyCategoryDto, companyId: string) {
    const companyIdObjectId = new Schema.Types.ObjectId(companyId);
    const categoryIdObjectId = new Schema.Types.ObjectId(data.categoryId);

    // Verify category exists
    const category = await skillCategoryRepository.findById(data.categoryId);
    if (!category) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Skill category not found");
    }

    // Check if mapping already exists
    const exists = await companyCategoryRepository.exists(companyId, data.categoryId);
    if (exists) {
      throw new ApiError(StatusCodes.CONFLICT, "This category is already added to your company");
    }

    const mapping = await companyCategoryRepository.create({
      ...data,
      companyId: companyIdObjectId,
      categoryId: categoryIdObjectId,
    });

    return mapping;
  }

  /**
   * Get all categories for company
   */
  async getByCompany(companyId: string, query: GetCompanyCategoriesQueryDto = {}) {
    const companyIdObjectId = new Schema.Types.ObjectId(companyId);

    return companyCategoryRepository.findByCompany(companyId, query);
  }

  /**
   * Get enabled categories for company
   */
  async getEnabledByCompany(companyId: string) {
    return companyCategoryRepository.findEnabledByCompany(companyId);
  }

  /**
   * Get company category by ID
   */
  async getById(id: string) {
    const mapping = await companyCategoryRepository.findById(id);

    if (!mapping) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Company category mapping not found");
    }

    return mapping;
  }

  /**
   * Enable category for company
   */
  async enable(id: string) {
    return this.update(id, { enabled: true });
  }

  /**
   * Disable category for company
   */
  async disable(id: string) {
    return this.update(id, { enabled: false });
  }

  /**
   * Update company category mapping
   */
  async update(id: string, data: UpdateCompanyCategoryDto) {
    const updated = await companyCategoryRepository.update(id, data);

    if (!updated) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Company category mapping not found");
    }

    return updated;
  }

  /**
   * Remove category from company
   */
  async remove(id: string) {
    const deleted = await companyCategoryRepository.delete(id);

    if (!deleted) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Company category mapping not found");
    }

    return { message: "Category removed from company successfully" };
  }

  /**
   * Bulk enable categories
   */
  async bulkEnable(companyId: string, categoryIds: string[]) {
    const count = await companyCategoryRepository.bulkEnable(companyId, categoryIds);
    return { enabledCount: count, message: `${count} categories enabled` };
  }

  /**
   * Bulk disable categories
   */
  async bulkDisable(companyId: string, categoryIds: string[]) {
    const count = await companyCategoryRepository.bulkDisable(companyId, categoryIds);
    return { disabledCount: count, message: `${count} categories disabled` };
  }

  /**
   * Initialize company with default categories (if needed)
   * Called when company registers
   */
  async initializeCompanyCategories(companyId: string) {
    // Get all admin categories
    const adminCategories = await skillCategoryRepository.findAll({
      createdType: "ADMIN",
      archived: false,
      status: "active",
    });

    // Create mappings (disabled by default)
    const mappings = await Promise.all(
      adminCategories.categories.map((cat) =>
        companyCategoryRepository.create({
          categoryId: cat._id,
          companyId: new Schema.Types.ObjectId(companyId),
        })
      )
    );

    return mappings;
  }
}

export default new CompanyCategoryService();
