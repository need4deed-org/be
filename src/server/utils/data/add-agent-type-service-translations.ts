import { EntityTableName, OptionTitle } from "need4deed-sdk";
import { In } from "typeorm";
import { dataSource } from "../../../data/data-source";
import FieldTranslation from "../../../data/entity/field_translation.entity";
import Agent from "../../../data/entity/opportunity/agent.entity";
import { getRepository } from "../../../data/utils";

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
              agentTypeId: In(agentTypeIds),
            },
          ]
        : []),
      ...(serviceIds.length ? [{ serviceId: In(serviceIds) }] : []),
    ],
    relations: ["language"],
  });

  const translationsByKey = new Map<string, OptionTitle>();
  for (const row of rows) {
    const key = row.agentTypeId
      ? `${EntityTableName.AGENT_TYPE}_${row.agentTypeId}`
      : `${EntityTableName.SERVICE}_${row.serviceId}`;
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
