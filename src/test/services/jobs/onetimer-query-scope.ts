import type * as OnetimerQuery from "../../../server/utils/data/build-onetimer-opportunity-query";

export const onetimerQueryScope = { agentId: 0 };

export const SCOPED = Symbol("scoped onetimer query");

// The jobs sweep every onetimer in the shared test DB; confine them to the current test's agent.
export function scopeOnetimerQuery(
  original: typeof OnetimerQuery,
): typeof OnetimerQuery {
  const buildOnetimerOpportunityQuery: typeof original.buildOnetimerOpportunityQuery =
    (fastify) =>
      original
        .buildOnetimerOpportunityQuery(fastify)
        .andWhere("opportunity.agentId = :scopedAgentId", {
          scopedAgentId: onetimerQueryScope.agentId,
        });
  return {
    ...original,
    buildOnetimerOpportunityQuery: Object.assign(
      buildOnetimerOpportunityQuery,
      {
        [SCOPED]: true,
      },
    ),
  };
}
