import { In } from "typeorm";
import { describe, expect, it, vi } from "vitest";
import { getAgentWhere } from "../../../../server/utils/data/get-agent-where";

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
});
