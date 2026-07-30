import { SkillUser, ISkillUser } from "../models/skillUser.model";
import { CreateSkillUserDto, UpdateSkillUserDto, GetSkillUsersQueryDto } from "../dto/skillUser.dto";
import { Schema } from "mongoose";

export class SkillUserRepository {
  /**
   * Create a new skill user relationship
   */
  async create(data: CreateSkillUserDto): Promise<ISkillUser> {
    const skillUser = new SkillUser(data);
    return skillUser.save();
  }

  /**
   * Find skill user by ID
   */
  async findById(id: string): Promise<ISkillUser | null> {
    return SkillUser.findById(id)
      .populate("userId", "fullName email")
      .populate({
        path: "skillId",
        populate: { path: "categoryId", select: "name" },
      })
      .exec();
  }

  /**
   * Find skill user by userId and skillId (unique combination)
   */
  async findByUserAndSkill(userId: string, skillId: string): Promise<ISkillUser | null> {
    const Types = require('mongoose').Types;
    return SkillUser.findOne({ 
      userId: new Types.ObjectId(userId), 
      skillId: new Types.ObjectId(skillId) 
    } as any)
      .populate("userId", "fullName email")
      .populate({
        path: "skillId",
        populate: { path: "categoryId", select: "name" },
      })
      .exec();
  }

  /**
   * Find all skills for a user
   */
  async findByUser(userId: string, query: GetSkillUsersQueryDto = {}): Promise<{ skillUsers: ISkillUser[]; total: number }> {
    const Types = require('mongoose').Types;
    const { page = 1, limit = 10, level } = query;

    const filter: any = { userId: new Types.ObjectId(userId) };

    if (level) {
      filter.level = level;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [skillUsers, total] = await Promise.all([
      SkillUser.find(filter)
        .populate({
          path: "skillId",
          select: "name description categoryId",
          populate: { path: "categoryId", select: "name" },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .exec(),
      SkillUser.countDocuments(filter),
    ]);

    return { skillUsers, total };
  }

  /**
   * Find all users for a skill
   */
  async findBySkill(skillId: string, query: GetSkillUsersQueryDto = {}): Promise<{ skillUsers: ISkillUser[]; total: number }> {
    const { page = 1, limit = 10, level } = query;

    const filter: any = { skillId };

    if (level) {
      filter.level = level;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [skillUsers, total] = await Promise.all([
      SkillUser.find(filter)
        .populate("userId", "fullName email organisationId")
        .sort({ score: -1 })
        .skip(skip)
        .limit(Number(limit))
        .exec(),
      SkillUser.countDocuments(filter),
    ]);

    return { skillUsers, total };
  }

  /**
   * Upsert skill user (create or update if exists)
   */
  async upsert(userId: string, skillId: string, data: UpdateSkillUserDto): Promise<ISkillUser> {
    const Types = require('mongoose').Types;
    const updated = await SkillUser.findOneAndUpdate(
      { userId: new Types.ObjectId(userId), skillId: new Types.ObjectId(skillId) },
      {
        $set: {
          ...data,
          lastAssessedAt: data.lastAssessedAt || new Date(),
        },
      },
      { upsert: true, new: true, runValidators: true }
    )
      .populate({
        path: "skillId",
        populate: { path: "categoryId", select: "name" },
      })
      .exec();

    return updated!;
  }

  /**
   * Update skill user
   */
  async update(id: string, data: UpdateSkillUserDto): Promise<ISkillUser | null> {
    return SkillUser.findByIdAndUpdate(id, data, { new: true, runValidators: true })
      .populate("userId", "fullName email")
      .populate({
        path: "skillId",
        populate: { path: "categoryId", select: "name" },
      })
      .exec();
  }

  /**
   * Delete skill user relationship
   */
  async delete(id: string): Promise<boolean> {
    const result = await SkillUser.findByIdAndDelete(id).exec();
    return result !== null;
  }

  /**
   * Delete all skills for a user (bulk delete)
   */
  async deleteByUser(userId: string): Promise<number> {
    const Types = require('mongoose').Types;
    const result = await SkillUser.deleteMany({ userId: new Types.ObjectId(userId) }).exec();
    return result.deletedCount || 0;
  }

  /**
   * Get skills by questionnaire response
   */
  async findByQuestionnaire(questionnaireId: string): Promise<ISkillUser[]> {
    const Types = require('mongoose').Types;
    return SkillUser.find({ questionnaireId: new Types.ObjectId(questionnaireId) } as any)
      .populate("userId", "fullName email")
      .populate({
        path: "skillId",
        populate: { path: "categoryId", select: "name" },
      })
      .exec();
  }

  /**
   * Get user skills for enabled categories only (company perspective)
   */
  async findUserSkillsInEnabledCategories(userId: string, companyId: string): Promise<ISkillUser[]> {
    const Types = require('mongoose').Types;
    const CompanyCategory = require("../models/companyCategory.model").CompanyCategory;

    // Get enabled categories for the company
    const enabledCategories = await CompanyCategory.find({ companyId: new Types.ObjectId(companyId), enabled: true } as any).select("categoryId");
    const categoryIds = enabledCategories.map((cc: any) => cc.categoryId);

    // Find skills in those categories
    return SkillUser.find({ userId: new Types.ObjectId(userId) } as any)
      .populate({
        path: "skillId",
        match: { categoryId: { $in: categoryIds } },
        populate: { path: "categoryId", select: "name" },
      })
      .exec();
  }
}

export default new SkillUserRepository();
