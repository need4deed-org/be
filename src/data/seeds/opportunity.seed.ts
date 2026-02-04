import { OpportunityType, TranslatedIntoType } from "need4deed-sdk";
import { DataSource } from "typeorm";
import { seedOpportunitiesFile } from "../../config/constants";
import Opportunity from "../entity/opportunity/opportunity.entity";
import { readJsonAsync } from "../utils";
import { OpportunityJSON } from "./types";
import {
  createDeal,
  getCount,
  getEnumValue,
  getOrCreateAgent,
  getRepository,
} from "./utils";

export async function seedOpportunities(dataSource: DataSource): Promise<void> {
  if (!dataSource) {
    throw new Error("DataSource is not initialized.");
  }

  const opportunityRepository = getRepository(dataSource, Opportunity);

  const count = await getCount(opportunityRepository);
  if (count !== 0) {
    dataSource.logger.log("log", "Skipping seeding opportunities.");
    return;
  }

  const opportunities = (await readJsonAsync(
    seedOpportunitiesFile,
  )) as OpportunityJSON[];

  for (const opportunity of opportunities) {
    try {
      const title = opportunity.title;

      if (!title) {
        throw new Error("title is missing.");
      }

      const deal = await createDeal(opportunity.deal, dataSource);

      const agent = await getOrCreateAgent(opportunity.agent, dataSource);

      const newOpportunity = new Opportunity({
        title,
        type:
          getEnumValue(OpportunityType, opportunity.info) ||
          OpportunityType.REGULAR,
        translationType:
          getEnumValue(TranslatedIntoType, opportunity.translationType) ||
          TranslatedIntoType.NO_TRANSLATION,
        info: opportunity.info || "",
        infoConfidential: opportunity.infoConfidential || "",
        agent,
        deal,
      });
      await opportunityRepository.save(newOpportunity);
    } catch (error) {
      dataSource.logger.log(
        "log",
        `Creation of opportunity ${opportunity?.title} rolled back due to error: ${error.message}`,
      );
    }
  }
}
