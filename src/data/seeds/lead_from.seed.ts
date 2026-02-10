import { DataSource } from "typeorm";
import { seedLeadFromFile } from "../../config/constants";
import LeadFrom from "../entity/lead.entity";
import { getRepository, readJsonAsync } from "../utils";
import { getCount } from "./utils";

interface LeadJSON {
  id: string;
  count: number;
}

export async function seedLeadFrom(dataSource: DataSource): Promise<void> {
  if (!dataSource) {
    throw new Error("DataSource is not initialized.");
  }

  const leadFromRepository = getRepository(dataSource, LeadFrom);

  const count = await getCount(leadFromRepository);
  if (count !== 0) {
    dataSource.logger.log("log", "Skipping seeding leads.");
    return;
  }

  const leads = (await readJsonAsync(seedLeadFromFile)) as LeadJSON[];

  const existingLeads = new Set(
    (await leadFromRepository.find()).map((lead) => lead.title),
  );

  const leadsForInsert = leads.reduce((result: LeadFrom[], { id, count }) => {
    if (existingLeads.has(id)) {
      return result;
    }
    try {
      const newLeadFrom = new LeadFrom({ title: id, count });
      result.push(newLeadFrom);
    } catch (error) {
      throw new Error(`Error creating new lead ${id}: ${error.message}`);
    }
    return result;
  }, []);

  try {
    await leadFromRepository.insert(leadsForInsert);
  } catch (error) {
    throw new Error(`Error inserting leads: ${error.message}`);
  }
}
