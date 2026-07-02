import { SkillCategoryRepository } from "../repositories/skill-category.repository";

import { CreateSkillCategoryDto, UpdateSkillCategoryDto } from '../dto/skill-category.dto';

export class SkillCategoryService {

  private repository =
    new SkillCategoryRepository();

  create(
    payload: CreateSkillCategoryDto
  ) {
    return this.repository.create(payload);
  }

  getAll() {
    return this.repository.findAll();
  }

  getById(id: string) {
    return this.repository.findById(id);
  }

  update(
    id: string,
    payload: UpdateSkillCategoryDto
  ) {
    return this.repository.update(
      id,
      payload
    );
  }

  delete(id: string) {
    return this.repository.delete(id);
  }

}