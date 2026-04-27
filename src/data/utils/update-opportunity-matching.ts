import { tryCatch } from "../../services/utils";
import { dataSource } from "../data-source";
import OpportunityVolunteer from "../entity/m2m/opportunity-volunteer";
import Opportunity from "../entity/opportunity/opportunity.entity";
import { resolveOpportunityMatchStatus, resolveOpportunityStatus } from "../lib";
import { getRepository } from "./get-repository";

export async function updateOpportunityMatching(id: number): Promise<void> {
  const opportunityRepository = getRepository(dataSource, Opportunity);
  const opportunity = await opportunityRepository.findOneBy({ id });
  if (!opportunity) {
    return dataSource.logger.log(
      "warn",
      `Opportunity id:${id} not found during match status update.`,
    );
  }

  const opportunityVolunteerRepository = getRepository(
    dataSource,
    OpportunityVolunteer,
  );
  const volunteersLinked = await opportunityVolunteerRepository.find({
    where: { opportunityId: id },
  });

  const statusMatch = resolveOpportunityMatchStatus(
    volunteersLinked,
    opportunity.numberVolunteers,
  );
  const status = resolveOpportunityStatus(volunteersLinked, opportunity.status);

  const changed =
    statusMatch !== opportunity.statusMatch || status !== opportunity.status;

  if (changed) {
    const [, error] = await tryCatch(
      opportunityRepository.save(
        Object.assign(opportunity, { statusMatch, status }),
      ),
    );

    if (error) {
      dataSource.logger.log(
        "warn",
        `During saving opportunity (id:${id}) occurred: ${error}`,
      );
    }
  }
}
