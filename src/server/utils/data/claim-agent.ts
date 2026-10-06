import { DataSource, EntityManager } from "typeorm";
import { dataSource } from "../../../data/data-source";
import Agent from "../../../data/entity/opportunity/agent.entity";
import { getRepository } from "../../../data/utils";

// A coordinator-created NGO counts as claimed once it has an active member;
// until then it stays hidden from non-staff (assertAgentVisible, /search).
export async function claimAgent(
  agentId: number,
  manager: DataSource | EntityManager = dataSource,
): Promise<void> {
  await getRepository(manager, Agent).update(
    { id: agentId, unclaimed: true },
    { unclaimed: false },
  );
}
