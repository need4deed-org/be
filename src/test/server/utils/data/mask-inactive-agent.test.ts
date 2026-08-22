import { AgentEngagementStatusType, UserRole } from "need4deed-sdk";
import { describe, expect, it } from "vitest";
import { shouldMaskInactiveAgentData } from "../../../../server/utils/data/mask-inactive-agent";

describe("shouldMaskInactiveAgentData", () => {
  it("is true for a non-privileged caller when the agent is INACTIVE", () => {
    expect(
      shouldMaskInactiveAgentData(
        { engagementStatus: AgentEngagementStatusType.INACTIVE },
        UserRole.AGENT,
      ),
    ).toBe(true);
  });

  it("is false for coordinator/admin regardless of engagementStatus", () => {
    expect(
      shouldMaskInactiveAgentData(
        { engagementStatus: AgentEngagementStatusType.INACTIVE },
        UserRole.COORDINATOR,
      ),
    ).toBe(false);
    expect(
      shouldMaskInactiveAgentData(
        { engagementStatus: AgentEngagementStatusType.INACTIVE },
        UserRole.ADMIN,
      ),
    ).toBe(false);
  });

  it("is false for any other engagementStatus (scope is strictly INACTIVE)", () => {
    expect(
      shouldMaskInactiveAgentData(
        { engagementStatus: AgentEngagementStatusType.UNRESPONSIVE },
        UserRole.AGENT,
      ),
    ).toBe(false);
    expect(
      shouldMaskInactiveAgentData(
        { engagementStatus: AgentEngagementStatusType.ACTIVE },
        UserRole.AGENT,
      ),
    ).toBe(false);
  });

  it("is true for an undefined role (treated as non-privileged, not a crash)", () => {
    expect(
      shouldMaskInactiveAgentData(
        { engagementStatus: AgentEngagementStatusType.INACTIVE },
        undefined,
      ),
    ).toBe(true);
  });
});
