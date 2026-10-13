import { UserRole } from "need4deed-sdk";
import { ILike, In } from "typeorm";
import { describe, expect, it, vi } from "vitest";
import { getAgentWhere } from "../../../../server/utils/data/get-agent-where";
import { CallerVisibility } from "../../../../server/utils/pii/visible-persons";

const agentServiceFind = vi.fn();

vi.mock("../../../../data/data-source", () => ({
  dataSource: {
    getRepository: () => ({ find: agentServiceFind }),
  },
}));

describe("getAgentWhere", () => {
  it("returns an empty object when no filters are provided", async () => {
    expect(await getAgentWhere(undefined)).toEqual({});
  });

  it("filters by agentTypeId for `type`", async () => {
    const where = await getAgentWhere({ type: ["1", "2"] });
    expect(where).toEqual({ agentTypeId: In(["1", "2"]) });
  });

  // Regression test: a naive `agentService: { serviceId: In(...) }` filter
  // joins agent -> agent_service, so an agent matching more than one
  // selected service comes back once per match, duplicating it in
  // findAndCount's results and inflating the total. getAgentWhere resolves
  // matching agent ids in a separate query instead, so the outer filter is a
  // plain scalar `id IN (...)` with no join to fan out.
  it("dedupes an agent that matches more than one selected service into a single id", async () => {
    agentServiceFind.mockResolvedValue([
      { agentId: 5, serviceId: 1 },
      { agentId: 5, serviceId: 2 },
      { agentId: 7, serviceId: 2 },
    ]);

    const where = await getAgentWhere({ services: ["1", "2"] });

    expect(agentServiceFind).toHaveBeenCalledWith({
      where: { serviceId: In([1, 2]) },
    });
    expect(where).toEqual({ id: In([5, 7]) });
  });

  it("filters out every agent (rather than matching none-filtered) when no service matches", async () => {
    agentServiceFind.mockResolvedValue([]);
    const where = await getAgentWhere({ services: ["999"] });
    expect(where).toEqual({ id: In([-1]) });
  });

  it("combines a services match with other filters at the top level", async () => {
    agentServiceFind.mockResolvedValue([{ agentId: 3, serviceId: 4 }]);
    const where = await getAgentWhere({ services: ["4"], district: ["9"] });
    expect(where).toEqual({ id: In([3]), districtId: In(["9"]) });
  });

  describe("street filter for a masked caller (be#666)", () => {
    const visibility = (
      agentIds: number[],
      matchedAgentIds: number[] = [],
    ): CallerVisibility => ({
      userId: 1,
      role: UserRole.AGENT,
      personIds: new Set(),
      opportunityIds: new Set(),
      agentIds: new Set(agentIds),
      matchedAgentIds: new Set(matchedAgentIds),
      ownerAgentIds: new Set(),
    });

    it("leaves the street filter unscoped for a privileged caller", async () => {
      const where = await getAgentWhere({ street: "Main" }, null);
      expect(where).toEqual({ address: { street: ILike("%Main%") } });
    });

    it("scopes the street filter to agents whose address the caller can see", async () => {
      const where = await getAgentWhere(
        { street: "Main" },
        visibility([2], [4]),
      );
      expect(where).toEqual({
        address: { street: ILike("%Main%") },
        id: In([2, 4]),
      });
    });

    it("matches nothing when the caller can see no agent address", async () => {
      const where = await getAgentWhere({ street: "Main" }, visibility([]));
      expect(where).toEqual({
        address: { street: ILike("%Main%") },
        id: In([-1]),
      });
    });

    it("intersects the visible agents with a services match", async () => {
      agentServiceFind.mockResolvedValue([
        { agentId: 2, serviceId: 1 },
        { agentId: 3, serviceId: 1 },
      ]);
      const where = await getAgentWhere(
        { street: "Main", services: ["1"] },
        visibility([2, 5]),
      );
      expect(where).toEqual({
        address: { street: ILike("%Main%") },
        id: In([2]),
      });
    });

    it("does not scope a masked caller's query without a street filter", async () => {
      const where = await getAgentWhere({ district: ["9"] }, visibility([]));
      expect(where).toEqual({ districtId: In(["9"]) });
    });
  });
});
