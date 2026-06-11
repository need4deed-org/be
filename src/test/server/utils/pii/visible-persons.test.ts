import type { FastifyInstance } from "fastify";
import { UserRole } from "need4deed-sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type User from "../../../../data/entity/user.entity";
import { resolveVisiblePersonIds } from "../../../../server/utils/pii/visible-persons";

const find = vi.fn();
const query = vi.fn();

const fastify = {
  db: { agentPersonRepository: { find, manager: { query } } },
} as unknown as FastifyInstance;

const makeUser = (role: UserRole, personId: number | null = 1): User =>
  ({ id: 100, role, personId }) as unknown as User;

beforeEach(() => {
  vi.resetAllMocks();
});

describe("resolveVisiblePersonIds", () => {
  it("returns an empty set for USER (reference data only), no DB calls", async () => {
    const visible = await resolveVisiblePersonIds(
      fastify,
      makeUser(UserRole.USER),
    );
    expect([...visible]).toEqual([]);
    expect(find).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });

  it("returns an empty set when the caller has no personId", async () => {
    const visible = await resolveVisiblePersonIds(
      fastify,
      makeUser(UserRole.VOLUNTEER, null),
    );
    expect([...visible]).toEqual([]);
    expect(find).not.toHaveBeenCalled();
  });

  it("returns only the own person for VOLUNTEER, no DB calls", async () => {
    const visible = await resolveVisiblePersonIds(
      fastify,
      makeUser(UserRole.VOLUNTEER, 7),
    );
    expect([...visible]).toEqual([7]);
    expect(find).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });

  describe("AGENT branch", () => {
    it("returns own ∪ members ∪ volunteers on the agent's opportunities", async () => {
      // 1st find: caller's memberships -> agent ids
      find.mockResolvedValueOnce([
        { agentId: 42, personId: 1 },
        { agentId: 43, personId: 1 },
      ]);
      // 2nd find: members of those agents
      find.mockResolvedValueOnce([
        { agentId: 42, personId: 1 },
        { agentId: 42, personId: 2 },
        { agentId: 43, personId: 3 },
      ]);
      // raw SQL: persons of volunteers on the agents' opportunities
      query.mockResolvedValueOnce([{ person_id: 8 }, { person_id: 9 }]);

      const visible = await resolveVisiblePersonIds(
        fastify,
        makeUser(UserRole.AGENT, 1),
      );

      expect([...visible].sort((a, b) => a - b)).toEqual([1, 2, 3, 8, 9]);

      // member lookup is scoped to the caller's agent ids
      expect(find).toHaveBeenNthCalledWith(2, {
        where: { agentId: expect.anything() },
      });
      // raw SQL receives the agent ids array as its only parameter
      expect(query.mock.calls[0][1]).toEqual([[42, 43]]);
    });

    it("returns only the own person when the AGENT has no memberships", async () => {
      find.mockResolvedValueOnce([]); // no memberships

      const visible = await resolveVisiblePersonIds(
        fastify,
        makeUser(UserRole.AGENT, 5),
      );

      expect([...visible]).toEqual([5]);
      expect(find).toHaveBeenCalledTimes(1); // no member lookup
      expect(query).not.toHaveBeenCalled(); // no raw SQL
    });

    it("coerces raw SQL person_id values to numbers", async () => {
      find.mockResolvedValueOnce([{ agentId: 42, personId: 1 }]);
      find.mockResolvedValueOnce([{ agentId: 42, personId: 1 }]);
      query.mockResolvedValueOnce([{ person_id: "8" }]); // string from pg

      const visible = await resolveVisiblePersonIds(
        fastify,
        makeUser(UserRole.AGENT, 1),
      );

      expect(visible.has(8)).toBe(true);
      expect(visible.has("8" as unknown as number)).toBe(false);
    });
  });
});
