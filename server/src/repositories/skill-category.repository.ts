import { SkillCategory } from "../models/skillCategory.model";

import { CreateSkillCategoryDto, UpdateSkillCategoryDto } from '../dto/skill-category.dto';

export class SkillCategoryRepository {

  async create(
    payload: CreateSkillCategoryDto
  ) {
    return SkillCategory.create({
      ...payload,
      createdBy: payload.createdBy ? new (require('mongoose')).Types.ObjectId(payload.createdBy) : undefined,
    } as any);
  }

  async findAll(filters?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    createdType?: string;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};

    if (filters?.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
      ];
    }

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.createdType) {
      query.createdType = filters.createdType;
    }

    // Get total count
    const total = await SkillCategory.countDocuments(query);

    // Get paginated results
    const categories = await SkillCategory.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .populate('companyId', 'company_name');

    return {
      categories,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    return SkillCategory.findById(id);
  }

  async update(
    id: string,
    payload: UpdateSkillCategoryDto
  ) {
    return SkillCategory.findByIdAndUpdate(
      id,
      payload,
      {
        new: true
      }
    );
  }

  async updateStatus(id: string, isActive: boolean) {
    return SkillCategory.findByIdAndUpdate(
      id,
      { status: isActive ? 'active' : 'inactive' },
      { new: true }
    );
  }

  async find(query: any, skip: number = 0, limit: number = 10) {
    return SkillCategory.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
  }

  async countByQuery(query: any) {
    return SkillCategory.countDocuments(query);
  }

  async delete(id: string) {
    return SkillCategory.findByIdAndDelete(id);
  }

}