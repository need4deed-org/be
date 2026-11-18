import { AgentMembershipStatus, AgentRoleType } from "need4deed-sdk";
import { describe, expect, it } from "vitest";
import Agent from "../../../data/entity/opportunity/agent.entity";
import {
  getAgentContactPerson,
  getOpportunityRepresentativePerson,
  hasActiveMembership,
} from "../../../data/utils/get-opportunity-representative-person";

const member = (
  id: number,
  email: string | undefined,
  role = AgentRoleType.VOLUNTEER_COORDINATOR,
  status = AgentMembershipStatus.ACTIVE,
) => ({ role, status, personId: id, person: { id, email } });

const agentOf = (...agentPerson: ReturnType<typeof member>[]) =>
  new Agent({ agentPerson } as unknown as Partial<Agent>);

describe("getOpportunityRepresentativePerson", () => {
  it("prefers the stored contactPerson over submittedByPerson (be#833)", () => {
    // A manual relink (be#824) or the creation-time snapshot (be#833) is the
    // authoritative, deliberately-set value — it must win even though the
    // submitter also has an email.
    const opportunity = {
      contactPerson: { id: 1, email: "contact@center.de" },
      submittedByPerson: { id: 2, email: "submitter@center.de" },
      agent: { representative: { person: { id: 3, email: "rep@center.de" } } },
    };

    const result = getOpportunityRepresentativePerson(opportunity as any);

    expect(result?.id).toBe(1);
  });

  it("falls back to submittedByPerson when there is no stored contactPerson", () => {
    const opportunity = {
      contactPerson: undefined,
      submittedByPerson: { id: 2, email: "submitter@center.de" },
      agent: agentOf(
        member(3, "rep@center.de"),
        member(2, "submitter@center.de"),
      ),
    };

    const result = getOpportunityRepresentativePerson(opportunity as any);

    expect(result?.id).toBe(2);
  });

  it("falls back to the agent representative when neither contactPerson nor submittedByPerson is set", () => {
    const opportunity = {
      contactPerson: undefined,
      submittedByPerson: undefined,
      agent: { representative: { person: { id: 3, email: "rep@center.de" } } },
    };

    const result = getOpportunityRepresentativePerson(opportunity as any);

    expect(result?.id).toBe(3);
  });

  it("skips a candidate with no email in favor of one that has it", () => {
    const opportunity = {
      contactPerson: { id: 1, email: undefined },
      submittedByPerson: { id: 2, email: "submitter@center.de" },
      agent: agentOf(
        member(3, "rep@center.de"),
        member(2, "submitter@center.de"),
      ),
    };

    const result = getOpportunityRepresentativePerson(opportunity as any);

    expect(result?.id).toBe(2);
  });

  it("falls back to a candidate without an email when none has one", () => {
    const opportunity = {
      contactPerson: { id: 1, email: undefined },
      submittedByPerson: undefined,
      agent: { representative: undefined },
    };

    const result = getOpportunityRepresentativePerson(opportunity as any);

    expect(result?.id).toBe(1);
  });

  it("prefers an active agent member over a submitter who is not a member, e.g. staff", () => {
    const opportunity = {
      contactPerson: { id: 1, email: undefined },
      submittedByPerson: { id: 2, email: "coordinator@need4deed.org" },
      agent: agentOf(member(1, undefined), member(3, "member@center.de")),
    };

    const result = getOpportunityRepresentativePerson(opportunity as any);

    expect(result?.id).toBe(3);
  });

  it("prefers an active agent member over a pending submitter", () => {
    const opportunity = {
      contactPerson: { id: 1, email: undefined },
      submittedByPerson: { id: 2, email: "pending@center.de" },
      agent: agentOf(
        member(1, undefined),
        member(
          2,
          "pending@center.de",
          AgentRoleType.VOLUNTEER_COORDINATOR,
          AgentMembershipStatus.PENDING,
        ),
        member(3, "member@center.de"),
      ),
    };

    const result = getOpportunityRepresentativePerson(opportunity as any);

    expect(result?.id).toBe(3);
  });

  it("falls back to a non-member submitter when nobody at the agent has an email", () => {
    const opportunity = {
      contactPerson: { id: 1, email: undefined },
      submittedByPerson: { id: 2, email: "coordinator@need4deed.org" },
      agent: agentOf(member(1, undefined)),
    };

    const result = getOpportunityRepresentativePerson(opportunity as any);

    expect(result?.id).toBe(2);
  });

  it("falls back to the submitter when the agent memberships are not loaded", () => {
    const opportunity = {
      contactPerson: { id: 1, email: undefined },
      submittedByPerson: { id: 2, email: "submitter@center.de" },
      agent: new Agent({} as Partial<Agent>),
    };

    const result = getOpportunityRepresentativePerson(opportunity as any);

    expect(result?.id).toBe(2);
  });

  it("handles a null submitter loaded by the query relation strategy", () => {
    const opportunity = {
      contactPerson: { id: 1, email: undefined },
      submittedByPerson: null,
      agent: agentOf(member(3, "member@center.de")),
    };

    const result = getOpportunityRepresentativePerson(opportunity as any);

    expect(result?.id).toBe(3);
  });

  it("leaves the submitter out when asked to", () => {
    const opportunity = {
      contactPerson: { id: 1, email: undefined },
      submittedByPerson: { id: 2, email: "submitter@center.de" },
      agent: agentOf(member(3, "rep@center.de")),
    };

    const result = getOpportunityRepresentativePerson(opportunity as any, {
      includeSubmitter: false,
    });

    expect(result?.id).toBe(3);
  });
});

describe("getAgentContactPerson", () => {
  it("takes the representative when they have an email", () => {
    expect(
      getAgentContactPerson(
        agentOf(member(1, "rep@center.de"), member(2, "other@center.de")),
      )?.id,
    ).toBe(1);
  });

  it("takes another active member with an email when the representative has none", () => {
    expect(
      getAgentContactPerson(
        agentOf(
          member(1, undefined),
          member(
            2,
            "pending@center.de",
            AgentRoleType.VOLUNTEER_COORDINATOR,
            AgentMembershipStatus.PENDING,
          ),
          member(3, "member@center.de"),
        ),
      )?.id,
    ).toBe(3);
  });

  it("falls back to the representative when no member has an email", () => {
    expect(getAgentContactPerson(agentOf(member(1, undefined)))?.id).toBe(1);
  });

  it("is undefined without an agent", () => {
    expect(getAgentContactPerson(undefined)).toBeUndefined();
  });
});

describe("hasActiveMembership", () => {
  const agent = agentOf(
    member(1, "active@center.de"),
    member(
      2,
      "pending@center.de",
      AgentRoleType.VOLUNTEER_COORDINATOR,
      AgentMembershipStatus.PENDING,
    ),
  );

  it("is true only for an active member", () => {
    expect(hasActiveMembership(agent, 1)).toBe(true);
    expect(hasActiveMembership(agent, 2)).toBe(false);
    expect(hasActiveMembership(agent, 3)).toBe(false);
  });

  it("is false without a person id or memberships", () => {
    expect(hasActiveMembership(agent, undefined)).toBe(false);
    expect(hasActiveMembership(undefined, 1)).toBe(false);
  });
});
