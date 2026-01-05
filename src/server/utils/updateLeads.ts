import { dataSource } from "../../data/data-source";
import LeadFrom from "../../data/entity/lead.entity";

export async function updateLeads(leads: LeadFrom[]): Promise<void> {
  const leadFromRepository = dataSource.getRepository(LeadFrom);
  for (const lead of leads) {
    lead.count += 1;
  }
  await leadFromRepository.save(leads);
}
