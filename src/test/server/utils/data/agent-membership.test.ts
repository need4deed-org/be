import { FastifyRequest } from "fastify";
import { UserRole } from "need4deed-sdk";
import { describe, expect, it } from "vitest";
import { NotFoundError, UnauthorizedError } from "../../../../config";
import {
  assertAgentMemberOrStaffOr403,
  assertAgentMemberOrStaffOr404,
  assertRoleIn,
  isActiveAgentMember,
} from "../../../../server/utils/data/agent-membership";

const AGENT_ID = 7;
const OTHER_AGENT_ID = 8;

function fakeRequest(
  role: UserRole | undefined,
  callerAgentIds: number[] = [],
): FastifyRequest {
  return {
    authUser: role ? { role, personId: 1 } : undefined,
    callerAgentIds,
  } as unknown as FastifyRequest;
}

describe("assertRoleIn", () => {
  it("defaults to coordinator, agent and admin", () => {
    for (const role of [UserRole.COORDINATOR, UserRole.AGENT, UserRole.ADMIN]) {
      expect(() => assertRoleIn(fakeRequest(role))).not.toThrow();
    }
    expect(() => assertRoleIn(fakeRequest(UserRole.VOLUNTEER))).toThrow(
      UnauthorizedError,
    );
    expect(() => assertRoleIn(fakeRequest(undefined))).toThrow(
      UnauthorizedError,
    );
  });

  it("honours an explicit role list", () => {
    expect(() =>
      assertRoleIn(fakeRequest(UserRole.AGENT), [UserRole.ADMIN]),
    ).toThrow(UnauthorizedError);
  });
});

describe("isActiveAgentMember", () => {
  it("checks the caller's active agent ids", async () => {
    const request = fakeRequest(UserRole.AGENT, [AGENT_ID]);
    expect(await isActiveAgentMember(request, AGENT_ID)).toBe(true);
    expect(await isActiveAgentMember(request, OTHER_AGENT_ID)).toBe(false);
  });

  it("is false for a missing agent id", async () => {
    const request = fakeRequest(UserRole.AGENT, [AGENT_ID]);
    expect(await isActiveAgentMember(request, null)).toBe(false);
    expect(await isActiveAgentMember(request, undefined)).toBe(false);
  });
});

describe.each([
  {
    name: "assertAgentMemberOrStaffOr403",
    assert: (request: FastifyRequest, agentId: number) =>
      assertAgentMemberOrStaffOr403(request, agentId, "denied"),
    error: UnauthorizedError,
  },
  {
    name: "assertAgentMemberOrStaffOr404",
    assert: assertAgentMemberOrStaffOr404,
    error: NotFoundError,
  },
])("$name", ({ assert, error }) => {
  it("lets staff through without membership", async () => {
    await expect(
      assert(fakeRequest(UserRole.COORDINATOR), AGENT_ID),
    ).resolves.toBeUndefined();
    await expect(
      assert(fakeRequest(UserRole.ADMIN), AGENT_ID),
    ).resolves.toBeUndefined();
  });

  it("lets an agent through for their own agent only", async () => {
    const request = fakeRequest(UserRole.AGENT, [AGENT_ID]);
    await expect(assert(request, AGENT_ID)).resolves.toBeUndefined();
    await expect(assert(request, OTHER_AGENT_ID)).rejects.toThrow(error);
  });

  it("rejects a non-agent role even with an active membership", async () => {
    await expect(
      assert(fakeRequest(UserRole.VOLUNTEER, [AGENT_ID]), AGENT_ID),
    ).rejects.toThrow(error);
  });
});
