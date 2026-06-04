import { AgentRoleType } from "need4deed-sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Address from "../../../../data/entity/location/address.entity";
import Postcode from "../../../../data/entity/location/postcode.entity";
import AgentPerson from "../../../../data/entity/m2m/agent-person";
import Person from "../../../../data/entity/person.entity";
import {
  getOrCreateSubmitterPerson,
  streetFromAddress,
} from "../../../../server/utils/data/get-or-create-submitter-person";

const personFind = vi.fn();
const personSave = vi.fn();
const personUpdate = vi.fn((..._args: any[]) =>
  Promise.resolve({ affected: 1 }),
);
const agentPersonFind = vi.fn();
const agentPersonSave = vi.fn();
const addressCreate = vi.fn((d: any) => d);
const addressSave = vi.fn();
const addressUpdate = vi.fn((..._args: any[]) =>
  Promise.resolve({ affected: 1 }),
);
const postcodeFindOneBy = vi.fn();

const fakeManager: any = {
  getRepository: (entity: any) => {
    switch (entity) {
      case Person:
        return { findOne: personFind, save: personSave, update: personUpdate };
      case AgentPerson:
        return { findOne: agentPersonFind, save: agentPersonSave };
      case Address:
        return {
          create: addressCreate,
          save: addressSave,
          update: addressUpdate,
        };
      case Postcode:
        return { findOneBy: postcodeFindOneBy };
      default:
        throw new Error(`unexpected repo: ${entity?.name}`);
    }
  },
};

// rac_address / rac_plz default to empty so the address step is a no-op for the
// person/link-focused cases below; address behaviour is exercised separately.
const baseBody = {
  rac_email: "sam@center.de",
  rac_full_name: "Sam Submitter",
  rac_phone: "+49-30-2222222",
  rac_address: "",
  rac_plz: "",
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

  it("clears a stale lastName — single-token resubmit over a multi-token name sets lastName to null", async () => {
    personFind.mockResolvedValueOnce({
      id: 7,
      email: "sam@center.de",
      firstName: "Mary",
      lastName: "van der Berg",
    });
    personSave.mockImplementation(async (p: any) => p);
    agentPersonFind.mockResolvedValueOnce({
      id: 100,
      agentId: 42,
      personId: 7,
    });

    await getOrCreateSubmitterPerson(
      { ...baseBody, rac_full_name: "Cher" },
      42,
      fakeManager,
    );

    expect(personSave).toHaveBeenCalledTimes(1);
    const saved = personSave.mock.calls[0][0];
    expect(saved).toMatchObject({ id: 7, firstName: "Cher" });
    // null (not undefined) so TypeORM actually clears the column on update.
    expect(saved.lastName).toBeNull();
  });

  it("ignores a whitespace-only rac_phone — does not overwrite or mark dirty", async () => {
    personFind.mockResolvedValueOnce({
      id: 7,
      email: "sam@center.de",
      firstName: "Sam",
      phone: "+49-30-1111111",
    });
    agentPersonFind.mockResolvedValueOnce({
      id: 100,
      agentId: 42,
      personId: 7,
    });

    await getOrCreateSubmitterPerson(
      { ...baseBody, rac_full_name: "  ", rac_phone: "   " },
      42,
      fakeManager,
    );

    expect(personSave).not.toHaveBeenCalled();
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

  describe("address (rac_address / rac_plz)", () => {
    const addressBody = {
      ...baseBody,
      rac_address: "Musterstr. 1, 12345 Berlin",
      rac_plz: "12345",
    };

    it("existing person with an address — patches street and resolved postcode", async () => {
      personFind.mockResolvedValueOnce({
        id: 7,
        email: "sam@center.de",
        addressId: 500,
      });
      personSave.mockImplementation(async (p: any) => p);
      postcodeFindOneBy.mockResolvedValueOnce({ id: 9, value: "12345" });
      agentPersonFind.mockResolvedValueOnce({
        id: 100,
        agentId: 42,
        personId: 7,
      });

      await getOrCreateSubmitterPerson(addressBody, 42, fakeManager);

      // patchAddress -> patchEntity -> Address.update({ id }, data)
      expect(addressUpdate).toHaveBeenCalledTimes(1);
      expect(addressUpdate.mock.calls[0][0]).toMatchObject({ id: 500 });
      expect(addressUpdate.mock.calls[0][1]).toMatchObject({
        id: 500,
        street: "Musterstr. 1",
        postcodeId: 9,
      });
      expect(addressCreate).not.toHaveBeenCalled();
    });

    it("existing address + unknown rac_plz — updates street but leaves postcode untouched", async () => {
      personFind.mockResolvedValueOnce({
        id: 7,
        email: "sam@center.de",
        addressId: 500,
      });
      personSave.mockImplementation(async (p: any) => p);
      postcodeFindOneBy.mockResolvedValueOnce(null); // rac_plz not found
      agentPersonFind.mockResolvedValueOnce({
        id: 100,
        agentId: 42,
        personId: 7,
      });

      await getOrCreateSubmitterPerson(
        { ...addressBody, rac_plz: "99999" },
        42,
        fakeManager,
      );

      expect(addressUpdate).toHaveBeenCalledTimes(1);
      expect(addressUpdate.mock.calls[0][1]).toMatchObject({
        id: 500,
        street: "Musterstr. 1",
      });
      // postcodeId must not be set when rac_plz does not resolve.
      expect(addressUpdate.mock.calls[0][1]).not.toHaveProperty("postcodeId");
    });

    it("new person without an address — creates one and links it to the person", async () => {
      personFind.mockResolvedValueOnce(null);
      personSave.mockImplementation(async (p: any) => ({ ...p, id: 55 }));
      postcodeFindOneBy.mockResolvedValueOnce({ id: 9, value: "12345" });
      addressSave.mockResolvedValueOnce({ id: 777 });
      agentPersonFind.mockResolvedValueOnce(null);

      const result = await getOrCreateSubmitterPerson(
        addressBody,
        42,
        fakeManager,
      );

      // createAddress: create({ street, postcodeId }) then save
      expect(addressCreate).toHaveBeenCalledTimes(1);
      expect(addressCreate.mock.calls[0][0]).toMatchObject({
        street: "Musterstr. 1",
        postcodeId: 9,
      });
      // Person.addressId backfilled to the new address.
      expect(personUpdate).toHaveBeenCalledWith({ id: 55 }, { addressId: 777 });
      expect(result?.addressId).toBe(777);
    });

    it("new address + unknown rac_plz — falls back to 12345 for the postcode", async () => {
      personFind.mockResolvedValueOnce(null);
      personSave.mockImplementation(async (p: any) => ({ ...p, id: 55 }));
      // First lookup (rac_plz 99999) misses; createAddress then resolves the
      // FALLBACK_PLZ "12345".
      postcodeFindOneBy
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 1, value: "12345" });
      addressSave.mockResolvedValueOnce({ id: 778 });
      agentPersonFind.mockResolvedValueOnce(null);

      await getOrCreateSubmitterPerson(
        { ...addressBody, rac_plz: "99999" },
        42,
        fakeManager,
      );

      expect(postcodeFindOneBy.mock.calls[0][0]).toEqual({ value: "99999" });
      expect(postcodeFindOneBy.mock.calls[1][0]).toEqual({ value: "12345" });
      expect(addressCreate.mock.calls[0][0]).toMatchObject({
        street: "Musterstr. 1",
        postcodeId: 1,
      });
    });

    it("no rac_address and no rac_plz — touches neither Address nor Postcode", async () => {
      personFind.mockResolvedValueOnce({ id: 7, email: "sam@center.de" });
      personSave.mockImplementation(async (p: any) => p);
      agentPersonFind.mockResolvedValueOnce({
        id: 100,
        agentId: 42,
        personId: 7,
      });

      await getOrCreateSubmitterPerson(baseBody, 42, fakeManager);

      expect(postcodeFindOneBy).not.toHaveBeenCalled();
      expect(addressCreate).not.toHaveBeenCalled();
      expect(addressUpdate).not.toHaveBeenCalled();
    });
  });

  describe("streetFromAddress", () => {
    it.each([
      ["Musterstr. 1, 12345 Berlin", "Musterstr. 1"],
      ["Musterstr. 1 12345 Berlin", "Musterstr. 1"],
      ["Some Street 12", "Some Street 12"],
      ["", ""],
      ["   ", ""],
      ["12345 Berlin", ""],
    ])("%j -> %j", (input, expected) => {
      expect(streetFromAddress(input)).toBe(expected);
    });
  });
});
