import { EntityManager } from "typeorm";
import { tryCatch } from "../../services/utils";
import { dataSource } from "../data-source";
import OpportunityVolunteer from "../entity/m2m/opportunity-volunteer";
import Opportunity from "../entity/opportunity/opportunity.entity";
import { resolveOpportunityMatchStatus } from "../lib";
import { getRepository } from "./get-repository";

// Pass the caller's EntityManager when running inside a transaction (e.g.
// from OpportunityVolunteerSubscriber), so the recompute sees the uncommitted
// link rows; otherwise it reads committed data via the global dataSource.
export async function updateOpportunityMatching(
  id: number,
  manager: EntityManager = dataSource.manager,
): Promise<void> {
  const opportunityRepository = getRepository(manager, Opportunity);
  const opportunity = await opportunityRepository.findOneBy({ id });
  if (!opportunity) {
    return dataSource.logger.log(
      "warn",
      `This shouldn't've happened but opportunity id:${id} not found.`,
    );
  }

  const opportunityVolunteerRepository = getRepository(
    manager,
    OpportunityVolunteer,
  );
  const volunteersLinked = await opportunityVolunteerRepository.find({
    where: { opportunityId: id },
  });

  const statusMatch = resolveOpportunityMatchStatus(
    opportunity.statusMatch,
    volunteersLinked.map(({ status }) => status),
  );

  if (statusMatch !== opportunity.statusMatch) {
    const [, error] = await tryCatch(
      opportunityRepository.save(Object.assign(opportunity, { statusMatch })),
    );

    if (error) {
      dataSource.logger.log(
        "warn",
        `During saving opportunity (id:${id}) occurred: ${error}`,
      );
    }
  }
}
