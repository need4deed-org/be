import type * as OnetimerQuery from "../../../server/utils/data/build-onetimer-opportunity-query";

export const onetimerQueryScope = { agentId: 0 };

// The jobs sweep every onetimer in the shared test DB; confine them to the current test's agent.
export function scopeOnetimerQuery(
  original: typeof OnetimerQuery,
): typeof OnetimerQuery {
  return {
    ...original,
    buildOnetimerOpportunityQuery: (fastify) =>
      original
        .buildOnetimerOpportunityQuery(fastify)
        .andWhere("opportunity.agentId = :scopedAgentId", {
          scopedAgentId: onetimerQueryScope.agentId,
        }),
  };
}
