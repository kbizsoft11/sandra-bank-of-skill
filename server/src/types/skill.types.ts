import { SkillLevel } from "./common.types";

export interface ISkill {
  cat_id: string;
  user_id: string;
  skill_name: string;
  skill_desc: string;
  skill_level: 1 | 2 | 3 | 4;
  skill_score?: string;
}


export interface ISkillCategory {
  cat_name: string;
  cat_desc?: string;
}