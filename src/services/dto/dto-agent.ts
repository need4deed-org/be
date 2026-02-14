import { ApiAgentGetList } from "need4deed-sdk";
import Agent from "../../data/entity/opportunity/agent.entity";

export function dtoAgentGetList(agent: Agent): ApiAgentGetList {
  return {
    id: agent.id,
    title: agent.title,
    type: agent.type,
  };
}
