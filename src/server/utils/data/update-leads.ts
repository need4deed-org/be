import { In } from "typeorm";
import { dataSource } from "../../../data/data-source";
import LeadFrom from "../../../data/entity/lead.entity";
import StatisticsEvent, {
  LEAD_FROM_METRIC,
} from "../../../data/entity/statistics-event.entity";
import logger from "../../../logger";

// Bookkeeping only: a failure must never fail the registration.
export async function updateLeads(leads: LeadFrom[]): Promise<void> {
  const ids = [...new Set(leads.map((lead) => lead.id))];
  if (!ids.length) {
    return;
  }
  try {
    await dataSource.transaction(async (manager) => {
      await manager.increment(LeadFrom, { id: In(ids) }, "count", 1);
      await manager.insert(
        StatisticsEvent,
        ids.map((id) => ({ metric: LEAD_FROM_METRIC, valueKey: String(id) })),
      );
    });
  } catch (error) {
    logger.error(`"heard about us" answers not counted: ${error}`);
  }
}
