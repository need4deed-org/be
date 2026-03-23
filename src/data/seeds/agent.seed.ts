import { EntityTableName } from "need4deed-sdk";
import { DataSource } from "typeorm";
import { seedAgentsFile } from "../../config";
import { tryCatch } from "../../services/utils";
import Postcode from "../entity/location/postcode.entity";
import AgentPerson from "../entity/m2m/agent-person";
import AgentPostcode from "../entity/m2m/agent-postcode";
import NotionRelation from "../entity/notion-relation.entity";
import Agent from "../entity/opportunity/agent.entity";
import { fetchJsonFromUrl, getRepository } from "../utils";
import { AgentJSON } from "./types";
import {
  getAgentEngagement,
  getAgentPersonRole,
  getAgentSearchStatus,
  getAgentService,
  getAgentTrustLevel,
  getAgentType,
  getCount,
  getOrCreatePerson,
} from "./utils";

export async function seedAgents(dataSource: DataSource): Promise<void> {
  const agentRepository = getRepository(dataSource, Agent);

  const count = await getCount(agentRepository);
  if (count !== 0) {
    dataSource.logger.log("log", "Skipping seeding agents.");
    return;
  }

  const agentsJson = (await fetchJsonFromUrl(seedAgentsFile)) as AgentJSON[];

  for (const agentJson of agentsJson) {
    const agentObj = new Agent({
      title: agentJson.title || agentJson.website || "unknown",
      info: agentJson.about,
      website: agentJson.website,
      type: getAgentType(agentJson.type),
      trustLevel: getAgentTrustLevel(agentJson.trustLevel),
      searchStatus: getAgentSearchStatus(agentJson.statusSearch),
      engagementStatus: getAgentEngagement(agentJson.statusEngagement),
      services: agentJson.services?.map(getAgentService),
    });
    const [agent, error] = await tryCatch(agentRepository.save(agentObj));

    if (error) {
      dataSource.logger.log(
        "warn",
        `While creating an agent ${agentJson.nid} occurred: ${error}`,
      );
      continue;
    }

    const agentPostcodeRepository = getRepository(dataSource, AgentPostcode);
    const postcodeRepository = getRepository(dataSource, Postcode);
    const postcode12345 = await postcodeRepository.findOneBy({
      value: "12345",
    });
    const postcodesJson = agentJson.postcodes;
    postcodesJson.forEach(async (postcodeJson) => {
      const postcode = await postcodeRepository.findOneBy({
        value: postcodeJson,
      });
      const [, error] = await tryCatch(
        agentPostcodeRepository.save(
          new AgentPostcode({ postcode: postcode || postcode12345, agent }),
        ),
      );

      if (error) {
        dataSource.logger.log(
          "warn",
          `During storing postcode:${postcodeJson} for agent:${agentJson.nid} occurred: ${error}`,
        );
      }
    });

    const personsJson = agentJson.person;
    personsJson.forEach(async (personJson) => {
      if (Object.values(personJson).filter(Boolean).length) {
        const person = await getOrCreatePerson(personJson, dataSource);
        const agentPersonRepository = getRepository(dataSource, AgentPerson);
        const agentPersonOnj = new AgentPerson({
          agentId: agent.id,
          personId: person.id,
          role: getAgentPersonRole(personJson.role),
        });
        const [, error] = await tryCatch(
          agentPersonRepository.save(agentPersonOnj),
        );
        if (error) {
          dataSource.logger.log(
            "warn",
            `Storing agent-person m2m (agentId:${agent.id}, personId:${person.id}) occurred: ${error}`,
          );
        }
      }
    });

    const notionRelationRepository = getRepository(dataSource, NotionRelation);
    const opportunityNids = agentJson.opportunityNids;
    opportunityNids.forEach(async (opportunityNid) => {
      const notionRel = new NotionRelation({
        hostId: agent.id,
        hostType: EntityTableName.AGENT,
        hostNid: agentJson.nid,
        tenantType: EntityTableName.OPPORTUNITY,
        tenantNid: opportunityNid,
      });

      const [, error] = await tryCatch(
        notionRelationRepository.save(notionRel),
      );
      if (error) {
        dataSource.logger.log(
          "warn",
          `Storing notion relation (agentNid:${agentJson.nid}, opportunityNid:${opportunityNid}) occurred: ${error}`,
        );
      }
    });
  }
}
