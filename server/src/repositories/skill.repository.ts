import { CreateSkillDto, GetSkillQueryDto, UpdateSkillDto } from "../dto/skill.dto";
import { ISkill, Skill } from "../models/skill.model";

export class SkillRepository {
    async create(payload: CreateSkillDto) {
        const skill = new Skill({
            ...payload
        });

        return skill.save();
    }

    async findById(id: string) {
        return Skill.findById(id)
            .populate("cat_id", "cat_name")
            .populate("user_id", "fullName email");
    }

    async findByName(
        skill_name: string,
        cat_id: string,
        user_id: string
    ) {
        const query: any = {
            cat_id,
            user_id,
        };

        query.skill_name = {
            $regex: new RegExp(`^${skill_name.trim()}$`, "i"),
        };

        return Skill.findOne(query);
    }

    async getAll(query: GetSkillQueryDto) {
        const {
            page = 1,
            limit = 10,
            search,
            cat_id,
            user_id,
            skill_level,
            organisation_id,
        } = query;

        const filter: any = {};

        if (search) {
            filter.$or = [
                {
                    skill_name: {
                        $regex: search,
                        $options: "i",
                    },
                },
                {
                    skill_desc: {
                        $regex: search,
                        $options: "i",
                    },
                },
            ];
        }

        if (cat_id) {
            filter.cat_id = cat_id as any;
        }

        if (user_id) {
            filter.user_id = user_id as any;
        }

        if (skill_level) {
            filter.skill_level = skill_level;
        }

        // Build query for skills
        let skillQuery = Skill.find(filter)
            .populate("cat_id", "cat_name")
            .populate("user_id", "fullName email organisationId")
            .sort({ created_at: -1 });

        // If filtering by organisation_id, we need to filter after populating user_id
        if (organisation_id) {
            const [skills, total] = await Promise.all([
                skillQuery
                    .skip((Number(page) - 1) * Number(limit))
                    .limit(Number(limit))
                    .then((skills) => 
                        skills.filter((skill: any) => 
                            skill.user_id?.organisationId?.toString() === organisation_id
                        )
                    ),
                
                Skill.find(filter)
                    .populate("user_id", "organisationId")
                    .then((skills) => 
                        skills.filter((skill: any) => 
                            skill.user_id?.organisationId?.toString() === organisation_id
                        ).length
                    ),
            ]);

            return {
                skills,
                pagination: {
                    total,
                    page: Number(page),
                    limit: Number(limit),
                    totalPages: Math.ceil(total / Number(limit)),
                },
            };
        }

        const [skills, total] = await Promise.all([
            skillQuery
                .skip((Number(page) - 1) * Number(limit))
                .limit(Number(limit)),

            Skill.countDocuments(filter),
        ]);

        return {
            skills,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit)),
            },
        };
    }

    async update(id: string, payload: UpdateSkillDto) {
        return Skill.findByIdAndUpdate(id, payload, {
            new: true,
            runValidators: true,
        });
    }

    async delete(id: string) {
        return Skill.findByIdAndDelete(id);
    }
}

export default new SkillRepository();