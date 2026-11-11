import { FastifyInstance, FastifyRequest } from "fastify";
import { ApiOpportunityGetList, Lang, UserRole } from "need4deed-sdk";
import { In } from "typeorm";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import { getDistrictCentroids } from "../../../data/utils/get-district";
import logger from "../../../logger";
import {
  dtoOpportunityGetList,
  getOpportunityDistrictIdNeedingCentroid,
} from "../../../services/dto/dto-opportunity";
import { maskForCaller } from "../pii/pre-serialization";
import { getCategoryToDealHandler } from "./add-category-to-deal";
import { getDistrictToOpportunityHandler } from "./add-district-to-opp";
import { isStaffRole } from "./is-staff-role";
import { orderByIds } from "./order-by-ids";
import { translateOpportunities } from "./translate-opportunities";
import { updateBackfilledColumn } from "./update-backfilled-column";

export const opportunityListRelations = [
  "deal.dealActivity.activity",
  "deal.dealLanguage.language",
  "deal.dealTimeslot.timeslot",
  "deal.dealDistrict.district",
  "deal.postcode",
  "agent",
  "agent.address.postcode",
  "address.postcode.districtPostcode",
  "accompanying.postcode.districtPostcode",
  "onetimer",
  "opportunityVolunteer.volunteer.person",
  "originalLanguage",
];

export async function loadOpportunityList(
  fastify: FastifyInstance,
  ids: number[],
): Promise<Opportunity[]> {
  const loaded = ids.length
    ? await fastify.db.opportunityRepository.find({
        where: { id: In(ids) },
        relations: opportunityListRelations,
        relationLoadStrategy: "query",
      })
    : [];
  return orderByIds(ids, loaded);
}

export async function dtoOpportunityListForCaller(
  fastify: FastifyInstance,
  request: FastifyRequest,
  opportunities: Opportunity[],
  lang: Lang,
): Promise<ApiOpportunityGetList[]> {
  const { addCategoryToDeal, updates: dealUpdates } =
    getCategoryToDealHandler();
  const { addDistrictToOpportunity, updates: opportunityUpdates } =
    getDistrictToOpportunityHandler();

  await Promise.all(
    opportunities.map(async (opportunity) => {
      Object.assign(opportunity, await addDistrictToOpportunity(opportunity));
      addCategoryToDeal(opportunity.deal);
    }),
  );

  await updateBackfilledColumn(
    fastify.db.dealRepository,
    dealUpdates,
    "categoryId",
  );
  await updateBackfilledColumn(
    fastify.db.opportunityRepository,
    opportunityUpdates,
    "districtId",
  );
  logger.debug(
    `Saving category updates: ${dealUpdates.length}, opportunity updates: ${opportunityUpdates.length}`,
  );

  await translateOpportunities(fastify, opportunities, lang);
  await maskForCaller(request, opportunities);

  const neededDistrictIds = new Map(
    opportunities.map((opportunity) => [
      opportunity.id,
      getOpportunityDistrictIdNeedingCentroid(opportunity),
    ]),
  );
  const districtCentroids = await getDistrictCentroids([
    ...new Set(
      [...neededDistrictIds.values()].filter(
        (id): id is number => id !== undefined,
      ),
    ),
  ]);

  const role = request.authUser?.role;
  const canSeeMatches = isStaffRole(role) || role === UserRole.AGENT;

  return opportunities.map((opportunity) => {
    const districtId = neededDistrictIds.get(opportunity.id);
    const dto = dtoOpportunityGetList(
      opportunity,
      districtId !== undefined ? districtCentroids.get(districtId) : undefined,
    );
    return canSeeMatches ? dto : { ...dto, volunteerNames: [] };
  });
}
