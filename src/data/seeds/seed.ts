import { DataSource } from "typeorm";
import { seedActivity } from "./activity.seed";
import { seedAgents } from "./agent.seed";
import { seedCategory } from "./category.seed";
import { seedDistrict } from "./district.seed";
import { seedFieldTranslation } from "./field_translation.seed";
import { seedLanguage } from "./language.seed";
import { seedLeadFrom } from "./lead_from.seed";
import { seedOpportunities } from "./opportunity.seed";
import { seedOptions } from "./option.seed";
import { seedPostcode } from "./postcode.seed";
import { seedSkill } from "./skill.seed";
import { seedTimeslots } from "./timeslot.seed";
import { seedUser } from "./user.seed";
import { seedVolunteers } from "./volunteer.seed";

export async function seed(dataSource: DataSource) {
  await seedLanguage(dataSource);
  await seedCategory(dataSource);
  await seedActivity(dataSource);
  await seedSkill(dataSource);
  await seedLeadFrom(dataSource);
  await seedFieldTranslation(dataSource);
  await seedPostcode(dataSource);
  await seedDistrict(dataSource);
  await seedOptions(dataSource);
  await seedUser(dataSource);
  await seedTimeslots(dataSource);
  await seedAgents(dataSource);
  await seedOpportunities(dataSource);
  await seedVolunteers(dataSource);

  return dataSource;
}
