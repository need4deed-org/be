import { FastifyRequest } from "fastify";
import { describe, expect, it } from "vitest";
import Person from "../../../../data/entity/person.entity";
import {
  maskForCaller,
  resolveCallerMask,
} from "../../../../server/utils/pii/pre-serialization";

describe("resolveCallerMask", () => {
  it("fails closed for an anonymous caller", async () => {
    const request = {} as FastifyRequest;
    const visibility = await resolveCallerMask(request);
    expect(visibility).not.toBeNull();
    expect(visibility?.personIds.size).toBe(0);
    expect(visibility?.agentIds.size).toBe(0);
    expect(visibility?.opportunityIds.size).toBe(0);

    const person = Object.assign(new Person(), { id: 1, email: "a@b.de" });
    await maskForCaller(request, person);
    expect(person.email).toMatch(/^[a-z]\*\*\*$/);
  });
});
