import { SkillCategory } from "../models/skillCategory.model";

import { CreateSkillCategoryDto, UpdateSkillCategoryDto } from '../dto/skill-category.dto';

export class SkillCategoryRepository {

  async create(
    payload: CreateSkillCategoryDto
  ) {
    return SkillCategory.create(payload);
  }

  async findAll() {
    return SkillCategory.find();
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

  async delete(id: string) {
    return SkillCategory.findByIdAndDelete(id);
  }

}