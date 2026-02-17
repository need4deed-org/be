import { OpportunityVolunteerStatusType } from "need4deed-sdk";
import Agent from "../../../data/entity/opportunity/agent.entity";

export function addVolunteerToAgent(
  agent: Agent,
): Agent & { activeVolunteers: number } {
  const activeVolunteers = agent.opportunity.reduce(
    (numVolunteers, opportunity) => {
      return (
        numVolunteers +
        opportunity.opportunityVolunteer.reduce(
          (activeVolunteers, opportunityVolunteer) => {
            return (
              activeVolunteers +
              (opportunityVolunteer.status ===
              OpportunityVolunteerStatusType.ACTIVE
                ? 1
                : 0)
            );
          },
          0,
        )
      );
    },
    0,
  );

  return Object.assign(agent, { activeVolunteers });
}
