import { PLATFORM_AGENT_ID } from "../../../config";

export function isPlatformPool(ownerAgentId: number | null | undefined) {
  return !ownerAgentId || ownerAgentId === PLATFORM_AGENT_ID;
}

export function ngoOwnerId(ownerAgentId: number | null | undefined) {
  return isPlatformPool(ownerAgentId) ? null : (ownerAgentId as number);
}

export function platformPoolSql(column: string) {
  return `(${column} IS NULL OR ${column} = ${PLATFORM_AGENT_ID})`;
}

export function withoutPlatformAgent(agentIds: Iterable<number>) {
  return [...agentIds].filter((id) => id !== PLATFORM_AGENT_ID);
}
