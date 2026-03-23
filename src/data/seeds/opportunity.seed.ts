import {
  EntityTableName,
  OpportunityType,
  TranslatedIntoType,
} from "need4deed-sdk";
import { DataSource } from "typeorm";
import { seedOpportunitiesFile } from "../../config/constants";
import { tryCatch } from "../../services/utils";
import NotionRelation from "../entity/notion-relation.entity";
import Accompanying from "../entity/opportunity/accompanying.entity";
import Opportunity from "../entity/opportunity/opportunity.entity";
import { fetchJsonFromUrl, getRepository } from "../utils";
import { OpportunityJSON } from "./types";
import {
  createDeal,
  getCount,
  getEnumValue,
  getOrCreateAgent,
  getToTranslate,
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

  const opportunities = (await fetchJsonFromUrl(
    seedOpportunitiesFile,
  )) as OpportunityJSON[];

  for (const opportunity of opportunities) {
    try {
      const title = opportunity.title;

      if (!title) {
        throw new Error("title is missing.");
      }

      const deal = await createDeal(opportunity.deal, dataSource);

      const notionRelationRepository = getRepository(
        dataSource,
        NotionRelation,
      );
      const [notionRelation] = await tryCatch(
        notionRelationRepository.findOne({
          where: {
            tenantNid: opportunity.nid,
            tenantType: EntityTableName.OPPORTUNITY,
            hostType: EntityTableName.AGENT,
          },
        }),
      );

      const accompanyingRepository = getRepository(dataSource, Accompanying);
      const [accompanying] = await tryCatch(
        opportunity.accompanying
          ? accompanyingRepository.save(
              new Accompanying({
                address: opportunity.accompanying.address || "Berlin",
                name: opportunity.accompanying.name || "unknown",
                phone: opportunity.accompanying.phone,
                date: new Date(opportunity.accompanying.date),
                languageToTranslate: getToTranslate(
                  opportunity.accompanying.languageToTranslate,
                ),
              }),
            )
          : Promise.reject(),
      );

      const newOpportunity = new Opportunity({
        title,
        type:
          getEnumValue(OpportunityType, opportunity.type) ||
          OpportunityType.REGULAR,
        translationType:
          getEnumValue(TranslatedIntoType, opportunity.translationType) ||
          TranslatedIntoType.NO_TRANSLATION,
        info: opportunity.info || "",
        infoConfidential: opportunity.infoConfidential || "",
        numberVolunteers: Number(opportunity.numberVolunteers || 1),
        ...(accompanying?.id ? { accompanyingId: accompanying.id } : {}),
        ...(notionRelation?.hostId
          ? { agentId: notionRelation?.hostId }
          : { agent: await getOrCreateAgent(opportunity.agent, dataSource) }),
        deal,
      });
      await opportunityRepository.save(newOpportunity);

      opportunity.volunteerNids.forEach(async ([volunteerNid, payroll]) => {
        const [, error] = await tryCatch(
          notionRelationRepository.save(
            new NotionRelation({
              payroll,
              hostNid: opportunity.nid,
              hostId: newOpportunity.id,
              hostType: EntityTableName.OPPORTUNITY,
              tenantNid: volunteerNid,
              tenantType: EntityTableName.VOLUNTEER,
            }),
          ),
        );
        if (error) {
          dataSource.logger.log(
            "warn",
            `Seems like pair: ${opportunity.nid}-${volunteerNid} already exists.`,
          );
        }
      });
    } catch (error) {
      dataSource.logger.log(
        "log",
        `Creation of opportunity ${opportunity?.nid} rolled back due to error: ${error.message}`,
      );
    }
  }
}
