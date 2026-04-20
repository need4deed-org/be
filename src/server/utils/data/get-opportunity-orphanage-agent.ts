import { NotFoundError, titleOrphanageAgent } from "../../../config";
import { dataSource } from "../../../data/data-source";
import Agent from "../../../data/entity/opportunity/agent.entity";
import { getRepository } from "../../../data/utils";

export async function getOpportunityOrphanageAgent() {
  const agentRepository = getRepository(dataSource, Agent);

  const orphanageAgent = await agentRepository.findOne({
    where: { title: titleOrphanageAgent },
  });

  if (!orphanageAgent) {
    throw new NotFoundError("Orphanage agent not found.");
  }

  return orphanageAgent;
}
