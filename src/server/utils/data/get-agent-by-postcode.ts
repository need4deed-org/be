import { NotFoundError } from "../../../config";
import Agent from "../../../data/entity/opportunity/agent.entity";

export function getAgentByPostcode(agents: Agent[], plz: string): Agent {
  for (const { agentPostcode } of agents) {
    const bingo = agentPostcode.find(({ postcode }) => {
      return postcode.value === plz;
    });
    if (bingo) {
      return bingo.agent;
    }
  }

  throw new NotFoundError(`Agent for postcode:${plz} not found.`);
}
