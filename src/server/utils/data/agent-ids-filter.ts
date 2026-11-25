export function parseAgentIdsFilter(
  value: string | string[] | undefined,
): number[] | null {
  if (value === undefined) {
    return null;
  }
  const values = Array.isArray(value) ? value : [value];
  return [...new Set(values.map(Number))];
}

export function intersectAgentIds(
  callerAgentIds: number[] | null,
  requestedAgentIds: number[] | null,
): number[] | null {
  if (!callerAgentIds) {
    return requestedAgentIds;
  }
  if (!requestedAgentIds) {
    return callerAgentIds;
  }
  return callerAgentIds.filter((id) => requestedAgentIds.includes(id));
}
