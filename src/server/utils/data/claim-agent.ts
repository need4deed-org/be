import { DataSource, EntityManager } from "typeorm";
import { dataSource } from "../../../data/data-source";
import Agent from "../../../data/entity/opportunity/agent.entity";
import { getRepository } from "../../../data/utils";

export async function claimAgent(
  agentId: number,
  manager: DataSource | EntityManager = dataSource,
): Promise<void> {
  await getRepository(manager, Agent).update(
    { id: agentId, unclaimed: true },
    { unclaimed: false },
  );
}
