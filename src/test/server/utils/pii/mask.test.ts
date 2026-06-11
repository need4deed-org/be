import { describe, expect, it } from "vitest";
import Address from "../../../../data/entity/location/address.entity";
import Person from "../../../../data/entity/person.entity";
import { maskPii, maskString } from "../../../../server/utils/pii/mask";

const MASKED = /^[a-z]\*\*\*$/;

const makePerson = (id: number): Person =>
  Object.assign(new Person(), {
    id,
    firstName: "John",
    lastName: "Doe",
    email: "john@example.de",
  });

const makeAddress = (street: string): Address =>
  Object.assign(new Address(), { street, city: "Berlin" });

describe("maskString", () => {
  it("returns a random char + '***' (hides length and first letter)", () => {
    expect(maskString()).toMatch(MASKED);
  });
});

describe("maskPii", () => {
  it("masks a Person not in the visible set", () => {
    const p = makePerson(2);
    maskPii(p, new Set([1]));
    expect(p.firstName).toMatch(MASKED);
    expect(p.lastName).toMatch(MASKED);
    expect(p.email).toMatch(MASKED);
  });

  it("leaves a visible Person untouched", () => {
    const p = makePerson(1);
    maskPii(p, new Set([1]));
    expect(p.firstName).toBe("John");
    expect(p.email).toBe("john@example.de");
  });

  it("masks a hidden Person's address but keeps a visible Person's address", () => {
    const hidden = makePerson(2);
    hidden.address = makeAddress("Main 1");
    const visible = makePerson(1);
    visible.address = makeAddress("Side 2");

    maskPii([hidden, visible], new Set([1]));

    expect(hidden.address.street).toMatch(MASKED);
    expect(visible.address.street).toBe("Side 2");
  });

  it("masks a standalone Address (not under a Person) and leaves non-PII fields", () => {
    const agentLike = {
      id: 5,
      title: "Center",
      address: makeAddress("Haupt 3"),
    };
    maskPii(agentLike, new Set([1]));
    expect(agentLike.address.street).toMatch(MASKED);
    expect(agentLike.title).toBe("Center");
  });

  it("leaves reference-like objects untouched and recurses to nested PII", () => {
    const graph = {
      id: 7,
      district: { id: 3, title: "Mitte" },
      volunteers: [{ id: 9, person: makePerson(2) }],
    };
    maskPii(graph, new Set());
    expect(graph.district.title).toBe("Mitte");
    expect(graph.volunteers[0].person.firstName).toMatch(MASKED);
  });

  it("is cycle-safe", () => {
    const p = makePerson(2);
    const wrapper: { person: Person; self?: unknown } = { person: p };
    (p as unknown as { back: unknown }).back = wrapper; // introduce a cycle
    expect(() => maskPii(wrapper, new Set([1]))).not.toThrow();
    expect(p.firstName).toMatch(MASKED);
  });
});
