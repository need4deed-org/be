import { EntityTableName, OptionTitle } from "need4deed-sdk";
import { In } from "typeorm";
import { dataSource } from "../../../data/data-source";
import FieldTranslation from "../../../data/entity/field_translation.entity";
import Agent from "../../../data/entity/opportunity/agent.entity";
import { getRepository } from "../../../data/utils";

/**
 * Resolves real en/de field_translation rows for each agent's agentType and
 * services, attaching them as agentType.translations / service.translations
 * (see the AgentType/Service entities) so the DTO can use them instead of
 * falling back to the raw title. Runs once per request as a batch, before
 * the preSerialization DTO conversion — mirrors addDistrictToAgent /
 * addComments2Entity. Expects the agentType and agentService.service
 * relations to already be loaded.
 */
export async function addAgentTypeServiceTranslations(
  agents: Agent[],
): Promise<Agent[]> {
  const agentTypeIds = [
    ...new Set(
      agents
        .map((agent) => agent.agentTypeId)
        .filter((id): id is number => Boolean(id)),
    ),
  ];
  const serviceIds = [
    ...new Set(
      agents.flatMap((agent) =>
        (agent.agentService ?? []).map(({ serviceId }) => serviceId),
      ),
    ),
  ];

  if (agentTypeIds.length === 0 && serviceIds.length === 0) {
    return agents;
  }

  const fieldTranslationRepository = getRepository(
    dataSource,
    FieldTranslation,
  );
  const rows = await fieldTranslationRepository.find({
    where: [
      ...(agentTypeIds.length
        ? [
            {
              entityType: EntityTableName.AGENT_TYPE,
              entityId: In(agentTypeIds),
            },
          ]
        : []),
      ...(serviceIds.length
        ? [{ entityType: EntityTableName.SERVICE, entityId: In(serviceIds) }]
        : []),
    ],
    relations: ["language"],
  });

  const translationsByKey = new Map<string, OptionTitle>();
  for (const row of rows) {
    const key = `${row.entityType}_${row.entityId}`;
    const entry = translationsByKey.get(key) ?? {};
    entry[row.language.isoCode as keyof OptionTitle] = row.translation;
    translationsByKey.set(key, entry);
  }

  for (const agent of agents) {
    if (agent.agentType) {
      agent.agentType.translations = translationsByKey.get(
        `${EntityTableName.AGENT_TYPE}_${agent.agentTypeId}`,
      );
    }
    for (const agentService of agent.agentService ?? []) {
      if (agentService.service) {
        agentService.service.translations = translationsByKey.get(
          `${EntityTableName.SERVICE}_${agentService.serviceId}`,
        );
      }
    }
  }

  return agents;
}
