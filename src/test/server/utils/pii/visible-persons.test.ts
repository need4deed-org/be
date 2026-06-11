import type { FastifyInstance } from "fastify";
import { UserRole } from "need4deed-sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type User from "../../../../data/entity/user.entity";
import { resolveCallerVisibility } from "../../../../server/utils/pii/visible-persons";

const find = vi.fn();
const query = vi.fn();

const fastify = {
  db: { agentPersonRepository: { find, manager: { query } } },
} as unknown as FastifyInstance;

const makeUser = (
  role: UserRole,
  personId: number | null = 1,
  id = 100,
): User => ({ id, role, personId }) as unknown as User;

const sorted = (s: Set<number>) => [...s].sort((a, b) => a - b);

beforeEach(() => {
  vi.resetAllMocks();
});

describe("resolveCallerVisibility", () => {
  it("returns empty sets (just the caller userId) for USER, no DB calls", async () => {
    const v = await resolveCallerVisibility(fastify, makeUser(UserRole.USER));
    expect(v.userId).toBe(100);
    expect([...v.personIds]).toEqual([]);
    expect([...v.opportunityIds]).toEqual([]);
    expect([...v.agentIds]).toEqual([]);
    expect(find).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });

  it("returns empty when the caller has no personId", async () => {
    const v = await resolveCallerVisibility(
      fastify,
      makeUser(UserRole.VOLUNTEER, null),
    );
    expect([...v.personIds]).toEqual([]);
    expect(find).not.toHaveBeenCalled();
  });

  describe("VOLUNTEER", () => {
    it("sees own person and the opportunities they're matched to", async () => {
      query.mockResolvedValueOnce([
        { opportunity_id: 11 },
        { opportunity_id: 12 },
      ]);

      const v = await resolveCallerVisibility(
        fastify,
        makeUser(UserRole.VOLUNTEER, 7),
      );

      expect([...v.personIds]).toEqual([7]);
      expect(sorted(v.opportunityIds)).toEqual([11, 12]);
      expect([...v.agentIds]).toEqual([]);
      expect(query.mock.calls[0][1]).toEqual([7]); // matched by own person id
      expect(find).not.toHaveBeenCalled();
    });
  });

  describe("AGENT", () => {
    it("sees own ∪ members ∪ matched volunteers' persons, plus their agents + opportunities", async () => {
      find.mockResolvedValueOnce([{ agentId: 42 }, { agentId: 43 }]); // memberships
      find.mockResolvedValueOnce([{ personId: 1 }, { personId: 2 }]); // members
      query.mockResolvedValueOnce([
        { id: 100, person_id: 8 },
        { id: 100, person_id: null }, // opportunity with no matched volunteer
        { id: 101, person_id: 9 },
      ]);

      const v = await resolveCallerVisibility(
        fastify,
        makeUser(UserRole.AGENT, 1),
      );

      expect(sorted(v.agentIds)).toEqual([42, 43]);
      expect(sorted(v.personIds)).toEqual([1, 2, 8, 9]);
      expect(sorted(v.opportunityIds)).toEqual([100, 101]);
      // member lookup scoped to the caller's agent ids; raw query gets them too
      expect(find).toHaveBeenNthCalledWith(2, {
        where: { agentId: expect.anything() },
      });
      expect(query.mock.calls[0][1]).toEqual([[42, 43]]);
    });

    it("stops at own person when the AGENT has no memberships", async () => {
      find.mockResolvedValueOnce([]); // no memberships

      const v = await resolveCallerVisibility(
        fastify,
        makeUser(UserRole.AGENT, 5),
      );

      expect([...v.personIds]).toEqual([5]);
      expect([...v.agentIds]).toEqual([]);
      expect([...v.opportunityIds]).toEqual([]);
      expect(find).toHaveBeenCalledTimes(1); // no member lookup
      expect(query).not.toHaveBeenCalled(); // no opportunity query
    });
  });
});
