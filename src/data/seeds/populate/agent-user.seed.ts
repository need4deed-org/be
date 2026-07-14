import { UserRole } from "need4deed-sdk";
import { DataSource } from "typeorm";
import { seedAgentsFile } from "../../../config/constants";
import logger from "../../../logger";
import Person from "../../entity/person.entity";
import User from "../../entity/user.entity";
import { fetchJsonFromUrl, getRepository, hashPassword } from "../../utils";
import { AgentJSON } from "./types";

export async function seedAgentUsers(dataSource: DataSource): Promise<void> {
  const agentsJson = (await fetchJsonFromUrl(seedAgentsFile)) as AgentJSON[];
  const userRepository = getRepository(dataSource, User);
  const personRepository = getRepository(dataSource, Person);

  const pwHash = await hashPassword("no_password");

  for (const agentJson of agentsJson ?? []) {
    for (const personJson of agentJson.person ?? []) {
      const email = personJson.email;
      if (!email) {
        continue;
      }

      const existing = await userRepository.findOne({ where: { email } });
      if (existing) {
        continue;
      }

      const person = await personRepository.findOne({ where: { email } });
      if (!person) {
        logger.warn(
          `Person ${email} not found — seedAgents must run before seedAgentUsers.`,
        );
        continue;
      }

      const user = new User({
        email,
        password: pwHash,
        role: UserRole.AGENT,
        isActive: true,
        person,
      });
      await userRepository.save(user);
      logger.info(`Created agent user: ${email}`);
    }
  }
}
