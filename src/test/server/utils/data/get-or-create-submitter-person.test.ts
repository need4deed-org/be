import { AgentRoleType } from "need4deed-sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AgentPerson from "../../../../data/entity/m2m/agent-person";
import Person from "../../../../data/entity/person.entity";
import { getOrCreateSubmitterPerson } from "../../../../server/utils/data/get-or-create-submitter-person";

const personFind = vi.fn();
const personSave = vi.fn();
const agentPersonFind = vi.fn();
const agentPersonSave = vi.fn();

const fakeManager: any = {
  getRepository: (entity: any) => {
    switch (entity) {
      case Person:
        return { findOne: personFind, save: personSave };
      case AgentPerson:
        return { findOne: agentPersonFind, save: agentPersonSave };
      default:
        throw new Error(`unexpected repo: ${entity?.name}`);
    }
  },
};

const baseBody = {
  rac_email: "sam@center.de",
  rac_full_name: "Sam Submitter",
  rac_phone: "+49-30-2222222",
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe("getOrCreateSubmitterPerson", () => {
  it("branch 1 — returns null and writes nothing when rac_email is empty", async () => {
    const result = await getOrCreateSubmitterPerson(
      { ...baseBody, rac_email: "" },
      42,
      fakeManager,
    );

    expect(result).toBeNull();
    expect(personFind).not.toHaveBeenCalled();
    expect(personSave).not.toHaveBeenCalled();
    expect(agentPersonFind).not.toHaveBeenCalled();
    expect(agentPersonSave).not.toHaveBeenCalled();
  });

  it("branch 2 — person found and AgentPerson link already exists: overwrites rac_* fields, no link upsert", async () => {
    personFind.mockResolvedValueOnce({ id: 7, email: "sam@center.de" });
    personSave.mockImplementation(async (p: any) => p);
    agentPersonFind.mockResolvedValueOnce({
      id: 100,
      agentId: 42,
      personId: 7,
    });

    const result = await getOrCreateSubmitterPerson(baseBody, 42, fakeManager);

    expect(result).toMatchObject({ id: 7, email: "sam@center.de" });
    // Existing record refreshed from this submission's rac_* fields.
    expect(personSave).toHaveBeenCalledTimes(1);
    expect(personSave.mock.calls[0][0]).toMatchObject({
      id: 7,
      firstName: "Sam",
      lastName: "Submitter",
      phone: "+49-30-2222222",
    });
    expect(agentPersonSave).not.toHaveBeenCalled();
  });

  it("branch 3 — person found without link: overwrites rac_* fields and upserts AgentPerson with VOLUNTEER_COORDINATOR role", async () => {
    personFind.mockResolvedValueOnce({ id: 7, email: "sam@center.de" });
    personSave.mockImplementation(async (p: any) => p);
    agentPersonFind.mockResolvedValueOnce(null);
    agentPersonSave.mockImplementation(async (ap: any) => ({ ...ap, id: 999 }));

    const result = await getOrCreateSubmitterPerson(baseBody, 42, fakeManager);

    expect(result?.id).toBe(7);
    expect(personSave).toHaveBeenCalledTimes(1);
    expect(personSave.mock.calls[0][0]).toMatchObject({
      id: 7,
      firstName: "Sam",
      lastName: "Submitter",
      phone: "+49-30-2222222",
    });
    expect(agentPersonSave).toHaveBeenCalledTimes(1);
    expect(agentPersonSave.mock.calls[0][0]).toMatchObject({
      agentId: 42,
      personId: 7,
      role: AgentRoleType.VOLUNTEER_COORDINATOR,
    });
  });

  it("branch 2 (no incoming values) — leaves an existing record untouched when rac_full_name and rac_phone are empty", async () => {
    personFind.mockResolvedValueOnce({
      id: 7,
      email: "sam@center.de",
      firstName: "Sam",
    });
    agentPersonFind.mockResolvedValueOnce({
      id: 100,
      agentId: 42,
      personId: 7,
    });

    await getOrCreateSubmitterPerson(
      { ...baseBody, rac_full_name: "  ", rac_phone: "" },
      42,
      fakeManager,
    );

    expect(personSave).not.toHaveBeenCalled();
    expect(agentPersonSave).not.toHaveBeenCalled();
  });

  it("overwrite is selective — fills only the provided field (phone) without clobbering the name", async () => {
    personFind.mockResolvedValueOnce({
      id: 7,
      email: "sam@center.de",
      firstName: "Existing",
      lastName: "Name",
    });
    personSave.mockImplementation(async (p: any) => p);
    agentPersonFind.mockResolvedValueOnce({
      id: 100,
      agentId: 42,
      personId: 7,
    });

    await getOrCreateSubmitterPerson(
      { ...baseBody, rac_full_name: "  ", rac_phone: "+49-30-9999999" },
      42,
      fakeManager,
    );

    expect(personSave).toHaveBeenCalledTimes(1);
    expect(personSave.mock.calls[0][0]).toMatchObject({
      id: 7,
      firstName: "Existing",
      lastName: "Name",
      phone: "+49-30-9999999",
    });
  });

  it("branch 4 — person not found: creates Person from rac_*, then upserts AgentPerson", async () => {
    personFind.mockResolvedValueOnce(null);
    personSave.mockImplementation(async (p: any) => ({ ...p, id: 55 }));
    agentPersonFind.mockResolvedValueOnce(null);

    const result = await getOrCreateSubmitterPerson(baseBody, 42, fakeManager);

    expect(personSave).toHaveBeenCalledTimes(1);
    expect(personSave.mock.calls[0][0]).toMatchObject({
      firstName: "Sam",
      lastName: "Submitter",
      email: "sam@center.de",
      phone: "+49-30-2222222",
    });

    expect(result?.id).toBe(55);
    expect(agentPersonSave).toHaveBeenCalledTimes(1);
    expect(agentPersonSave.mock.calls[0][0]).toMatchObject({
      agentId: 42,
      personId: 55,
      role: AgentRoleType.VOLUNTEER_COORDINATOR,
    });
  });

  it("branch 4 (name fallback) — uses email local-part when rac_full_name is whitespace-only", async () => {
    personFind.mockResolvedValueOnce(null);
    personSave.mockImplementation(async (p: any) => ({ ...p, id: 56 }));
    agentPersonFind.mockResolvedValueOnce(null);

    await getOrCreateSubmitterPerson(
      { ...baseBody, rac_full_name: "   " },
      42,
      fakeManager,
    );

    expect(personSave.mock.calls[0][0]).toMatchObject({
      firstName: "sam",
      lastName: undefined,
    });
  });

  it("branch 4 (single-token name) — leaves lastName undefined", async () => {
    personFind.mockResolvedValueOnce(null);
    personSave.mockImplementation(async (p: any) => ({ ...p, id: 57 }));
    agentPersonFind.mockResolvedValueOnce(null);

    await getOrCreateSubmitterPerson(
      { ...baseBody, rac_full_name: "Cher" },
      42,
      fakeManager,
    );

    expect(personSave.mock.calls[0][0]).toMatchObject({
      firstName: "Cher",
      lastName: undefined,
    });
  });

  it("branch 4 (multi-word last name) — joins trailing tokens", async () => {
    personFind.mockResolvedValueOnce(null);
    personSave.mockImplementation(async (p: any) => ({ ...p, id: 58 }));
    agentPersonFind.mockResolvedValueOnce(null);

    await getOrCreateSubmitterPerson(
      { ...baseBody, rac_full_name: "Mary van der Berg" },
      42,
      fakeManager,
    );

    expect(personSave.mock.calls[0][0]).toMatchObject({
      firstName: "Mary",
      lastName: "van der Berg",
    });
  });
});
