import { DataSource } from "typeorm";
import { seedSkillFile } from "../../config/constants";
import logger from "../../logger";
import Skill from "../entity/profile/skill.entity";
import { fetchJsonFromUrl, getRepository } from "../utils";
import { getCount } from "./utils";

interface SkillJSON {
  id: string;
}

export async function seedSkill(dataSource: DataSource): Promise<void> {
  if (!dataSource) {
    throw new Error("DataSource is not initialized.");
  }

  const skillRepository = getRepository(dataSource, Skill);

  const count = await getCount(skillRepository);
  if (count !== 0) {
    logger.info("Skipping seeding skills.");
    return;
  }

  const skills = (await fetchJsonFromUrl(seedSkillFile)) as SkillJSON[];

  const existingSkills = new Set(
    (await skillRepository.find()).map((skill) => skill.title),
  );

  const skillsForInsert = skills.reduce((result: Skill[], { id }) => {
    if (existingSkills.has(id)) {
      return result;
    }
    try {
      const newSkill = new Skill({ title: id });
      result.push(newSkill);
    } catch (error) {
      throw new Error(`Error creating new skill ${id}: ${error.message}`);
    }
    return result;
  }, []);

  try {
    await skillRepository.insert(skillsForInsert);
  } catch (error) {
    throw new Error(`Error inserting skills: ${error.message}`);
  }
}
