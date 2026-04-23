import { DataSource } from "typeorm";
import {
  seedAgentsFile,
  seedOpportunitiesFile,
  seedVolunteersFile,
} from "../../config/constants";
import logger from "../../logger";
import { tryCatch } from "../../services/utils";
import { dataSource } from "../data-source";
import Agent from "../entity/opportunity/agent.entity";
import Opportunity from "../entity/opportunity/opportunity.entity";
import Volunteer from "../entity/volunteer/volunteer.entity";
import { fetchJsonFromUrl, getRepository } from "../utils";

interface NidJSON {
  nid: string;
  title?: string;
  email?: string;
  timestamp?: string;
  deal?: { location?: { districts?: string[] } };
}

export async function seedNids(dataSource: DataSource): Promise<void> {
  let error: Error | null = null;

  if (!dataSource) {
    throw new Error("DataSource is not initialized.");
  }

  logger.info("Seeding NIDs to agents...");
  const agentRepository = getRepository(dataSource, Agent);
  const agents = await agentRepository.find();

  const agentsRaw = (await fetchJsonFromUrl(seedAgentsFile)) as NidJSON[];

  const agentsUpdated = agents.map((agent) => {
    const agentRaw = agentsRaw.find(({ title }) => title === agent.title);
    if (agentRaw) {
      agent.nid = agentRaw.nid;
    }
    return agent;
  });

  [, error] = await tryCatch(agentRepository.save(agentsUpdated));
  if (error) {
    throw new Error(`Error inserting agents: ${error.message}`);
  }
  logger.info("NIDs seeded to agents.");

  logger.info("Seeding NIDs to volunteers...");
  const volunteerRepository = getRepository(dataSource, Volunteer);
  const volunteers = await volunteerRepository.find({ relations: ["person"] });

  const volunteersRaw = (await fetchJsonFromUrl(
    seedVolunteersFile,
  )) as NidJSON[];

  const volunteersUpdated = volunteersRaw.map((volunteerRaw) => {
    const volunteersMatched = volunteers.filter(
      (volunteer) => volunteerRaw.email === volunteer.person.email,
    );
    if (volunteersMatched.length === 0) {
      return null;
    }
    const volunteerMatched = volunteersMatched.reduce((matched, vol) => {
      if (vol.createdAt.valueOf() > matched.createdAt.valueOf()) {
        return vol;
      }
      return matched;
    }, volunteersMatched[0]);

    return volunteerMatched
      ? Object.assign(volunteerMatched, { nid: volunteerRaw.nid })
      : null;
  });

  [, error] = await tryCatch(
    volunteerRepository.save(volunteersUpdated.filter(Boolean) as Volunteer[]),
  );
  if (error) {
    throw new Error(`Error inserting volunteers: ${error.message}`);
  }
  logger.info("NIDs seeded to volunteers.");

  logger.info("Seeding NIDs to opportunities...");
  const opportunityRepository = getRepository(dataSource, Opportunity);
  const opportunities = await opportunityRepository.find({
    relations: ["deal.location.district"],
  });

  const opportunitiesRaw = (await fetchJsonFromUrl(
    seedOpportunitiesFile,
  )) as NidJSON[];

  const opportunitiesUpdated = opportunitiesRaw.map((opportunityRaw) => {
    const opportunitiesMatched = opportunities.filter((opportunity) => {
      const isTitleMatch = opportunityRaw.title === opportunity.title;
      const isCreatedAtMatch =
        new Date(opportunityRaw.timestamp!).toLocaleDateString("de-DE") ===
        opportunity.createdAt.toLocaleDateString("de-DE");
      const isDistrictMatch =
        opportunity.deal?.location?.locationDistrict
          ?.map((district) => district.district.title)
          ?.some((title) =>
            opportunityRaw.deal?.location?.districts?.includes(title),
          ) ?? false;
      return isTitleMatch && isCreatedAtMatch && isDistrictMatch;
    });
    if (opportunitiesMatched.length === 0) {
      return null;
    }
    const opportunityMatched = opportunitiesMatched.reduce((matched, opp) => {
      if (opp.createdAt.valueOf() > matched.createdAt.valueOf()) {
        return opp;
      }
      return matched;
    }, opportunitiesMatched[0]);

    return opportunityMatched;
  });

  [, error] = await tryCatch(
    opportunityRepository.save(
      opportunitiesUpdated.filter(Boolean) as Opportunity[],
    ),
  );
  if (error) {
    throw new Error(`Error inserting opportunities: ${error.message}`);
  }
  logger.info("NIDs seeded to opportunities.");
}

// for direct execution
if (require.main === module) {
  seedNids(dataSource);
}
