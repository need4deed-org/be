import { dataSource } from "../../../data/data-source";
import LeadFrom from "../../../data/entity/lead.entity";
import StatisticsEvent from "../../../data/entity/statistics-event.entity";
import logger from "../../../logger";

export async function updateLeads(leads: LeadFrom[]): Promise<void> {
  const leadFromRepository = dataSource.getRepository(LeadFrom);
  for (const lead of leads) {
    lead.count += 1;
  }
  await leadFromRepository.save(leads);

  // Per-answer events give the "heard about us" statistics a timeline; the
  // counters above stay as the all-time totals.
  if (!leads.length) {
    return;
  }
  // Statistics only: a failure must not fail the registration it belongs to.
  const occurredAt = new Date();
  await dataSource
    .getRepository(StatisticsEvent)
    .save(
      leads.map(
        (lead) =>
          new StatisticsEvent({
            metric: "lead-from",
            occurredAt,
            valueKey: String(lead.id),
          }),
      ),
    )
    .catch((error) => logger.error(`lead-from statistics not saved: ${error}`));
}
