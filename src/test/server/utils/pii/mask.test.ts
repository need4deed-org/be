import { EntityTableName, UserRole } from "need4deed-sdk";
import { describe, expect, it } from "vitest";
import Comment from "../../../../data/entity/comment.entity";
import Address from "../../../../data/entity/location/address.entity";
import Accompanying from "../../../../data/entity/opportunity/accompanying.entity";
import Opportunity from "../../../../data/entity/opportunity/opportunity.entity";
import Person from "../../../../data/entity/person.entity";
import { maskPii, maskString } from "../../../../server/utils/pii/mask";
import { CallerVisibility } from "../../../../server/utils/pii/visible-persons";

const MASKED = /^[a-z]\*\*\*$/;

// Build a CallerVisibility from the few fields a given test cares about.
const ctx = (
  p: Partial<{
    userId: number;
    personIds: number[];
    opportunityIds: number[];
    agentIds: number[];
  }> = {},
): CallerVisibility => ({
  userId: p.userId ?? 0,
  personIds: new Set(p.personIds ?? []),
  opportunityIds: new Set(p.opportunityIds ?? []),
  agentIds: new Set(p.agentIds ?? []),
});

const makePerson = (id: number): Person =>
  Object.assign(new Person(), {
    id,
    firstName: "John",
    lastName: "Doe",
    email: "john@example.de",
  });

const makeAddress = (street: string): Address =>
  Object.assign(new Address(), { street, city: "Berlin" });

const makeAccompanying = (): Accompanying =>
  Object.assign(new Accompanying(), {
    name: "Refugee Name",
    address: "Hidden St 5",
    phone: "+49 30 111",
    email: "refugee@example.de",
  });

const makeComment = (over: Partial<Comment> = {}): Comment =>
  Object.assign(new Comment(), {
    id: 1,
    text: "internal note about someone",
    userId: 9,
    entityType: EntityTableName.OPPORTUNITY,
    entityId: 5,
    user: { role: UserRole.AGENT },
    ...over,
  });

describe("maskString", () => {
  it("returns a random char + '***' (hides length and first letter)", () => {
    expect(maskString()).toMatch(MASKED);
  });
});

describe("maskPii", () => {
  it("masks a Person not in the visible set", () => {
    const p = makePerson(2);
    maskPii(p, ctx({ personIds: [1] }));
    expect(p.firstName).toMatch(MASKED);
    expect(p.lastName).toMatch(MASKED);
    expect(p.email).toMatch(MASKED);
  });

  it("leaves a visible Person untouched", () => {
    const p = makePerson(1);
    maskPii(p, ctx({ personIds: [1] }));
    expect(p.firstName).toBe("John");
    expect(p.email).toBe("john@example.de");
  });

  it("masks a hidden Person's address but keeps a visible Person's address", () => {
    const hidden = makePerson(2);
    hidden.address = makeAddress("Main 1");
    const visible = makePerson(1);
    visible.address = makeAddress("Side 2");

    maskPii([hidden, visible], ctx({ personIds: [1] }));

    expect(hidden.address.street).toMatch(MASKED);
    expect(visible.address.street).toBe("Side 2");
  });

  it("masks a standalone Address (not under a Person) and leaves non-PII fields", () => {
    const agentLike = {
      id: 5,
      title: "Center",
      address: makeAddress("Haupt 3"),
    };
    maskPii(agentLike, ctx({ personIds: [1] }));
    expect(agentLike.address.street).toMatch(MASKED);
    expect(agentLike.title).toBe("Center");
  });

  it("leaves reference-like objects untouched and recurses to nested PII", () => {
    const graph = {
      id: 7,
      district: { id: 3, title: "Mitte" },
      volunteers: [{ id: 9, person: makePerson(2) }],
    };
    maskPii(graph, ctx());
    expect(graph.district.title).toBe("Mitte");
    expect(graph.volunteers[0].person.firstName).toMatch(MASKED);
  });

  it("is cycle-safe", () => {
    const p = makePerson(2);
    const wrapper: { person: Person; self?: unknown } = { person: p };
    (p as unknown as { back: unknown }).back = wrapper; // introduce a cycle
    expect(() => maskPii(wrapper, ctx({ personIds: [1] }))).not.toThrow();
    expect(p.firstName).toMatch(MASKED);
  });

  describe("accompanying", () => {
    it("masks an opportunity's accompanying when the opportunity isn't visible", () => {
      const opp = Object.assign(new Opportunity(), {
        id: 5,
        accompanying: makeAccompanying(),
      });
      maskPii(opp, ctx({ opportunityIds: [] }));
      expect(opp.accompanying!.name).toMatch(MASKED);
      expect(opp.accompanying!.address).toMatch(MASKED);
      expect(opp.accompanying!.phone).toMatch(MASKED);
      expect(opp.accompanying!.email).toMatch(MASKED);
    });

    it("leaves accompanying when the opportunity is visible", () => {
      const opp = Object.assign(new Opportunity(), {
        id: 5,
        accompanying: makeAccompanying(),
      });
      maskPii(opp, ctx({ opportunityIds: [5] }));
      expect(opp.accompanying!.name).toBe("Refugee Name");
      expect(opp.accompanying!.address).toBe("Hidden St 5");
    });
  });

  describe("comments", () => {
    it("masks a comment whose parent entity isn't visible and the caller didn't author", () => {
      const c = makeComment();
      maskPii(c, ctx({ userId: 1, opportunityIds: [] }));
      expect(c.text).toMatch(MASKED);
    });

    it("leaves a comment on a visible opportunity authored by a non-coordinator", () => {
      const c = makeComment({ user: { role: UserRole.AGENT } as never });
      maskPii(c, ctx({ userId: 1, opportunityIds: [5] }));
      expect(c.text).toBe("internal note about someone");
    });

    it("masks a COORDINATOR-authored comment even on a visible opportunity", () => {
      const c = makeComment({ user: { role: UserRole.COORDINATOR } as never });
      maskPii(c, ctx({ userId: 1, opportunityIds: [5] }));
      expect(c.text).toMatch(MASKED);
    });

    it("leaves a comment the caller authored, regardless of entity visibility", () => {
      const c = makeComment({
        userId: 7,
        user: { role: UserRole.COORDINATOR } as never,
      });
      maskPii(c, ctx({ userId: 7, opportunityIds: [] }));
      expect(c.text).toBe("internal note about someone");
    });

    it("leaves a comment on a visible agent entity", () => {
      const c = makeComment({
        entityType: EntityTableName.AGENT,
        entityId: 3,
        user: { role: UserRole.AGENT } as never,
      });
      maskPii(c, ctx({ userId: 1, agentIds: [3] }));
      expect(c.text).toBe("internal note about someone");
    });

    it("masks a comment on a non-opportunity/agent entity (conservative)", () => {
      const c = makeComment({
        entityType: EntityTableName.VOLUNTEER,
        entityId: 3,
        user: { role: UserRole.AGENT } as never,
      });
      maskPii(c, ctx({ userId: 1, opportunityIds: [5], agentIds: [3] }));
      expect(c.text).toMatch(MASKED);
    });
  });
});
