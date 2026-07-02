import { DataSource } from "typeorm";
import { check } from "..";
import { seedAgents } from "./populate/agent.seed";
import { devTime } from "./populate/dev-parsing";
import { seedOpportunities } from "./populate/opportunity.seed";
import { seedVolunteers } from "./populate/volunteer.seed";
import { seedReference } from "./reference";
import { seedUser } from "./user.seed";

export { seedReference } from "./reference";

export async function seed(dataSource: DataSource) {
  await seedReference(dataSource);
  await seedUser(dataSource);
  if (check.flag) {
    devTime(dataSource);
  } else {
    await seedAgents(dataSource);
    await seedOpportunities(dataSource);
    await seedVolunteers(dataSource);
  }

  return dataSource;
}
