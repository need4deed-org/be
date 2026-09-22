import { DocumentStatusType } from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { dataSource } from "../../../data/data-source";
import Deal from "../../../data/entity/deal.entity";
import Address from "../../../data/entity/location/address.entity";
import Postcode from "../../../data/entity/location/postcode.entity";
import Person from "../../../data/entity/person.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { getRepository } from "../../../data/utils";
import { writeVolunteerLegacy } from "../../../server/utils";
import {
  parserVolunteerSelfRegister,
  VolunteerSelfRegisterBody,
} from "../../../services/dto/parser-volunteer-self-register";

// be#1031/#1033 review: resolveAddress used to check exclusive ownership and
// fetch+mutate the Person's existing Address up front, then hand a plan (or
// the mutated entity itself) back for use much later in writeVolunteerLegacy
// — a window in which a concurrent edit to that Address, or a concurrent
// change to who else shares it, would go undetected. writeVolunteerLegacy now
// applies the reuse via patchOrReplaceAddress inside its own transaction,
// which re-checks exclusive ownership fresh right before writing. These
// tests exercise the real reuse-existing-address path end to end (not
// mocked) against both kinds of staleness.
describe("parserVolunteerSelfRegister + writeVolunteerLegacy address handling (be#1031/#1033 review)", () => {
  const body: VolunteerSelfRegisterBody = {
    addressPostcode: "10115",
    locations: [],
    languages: [],
    availability: [],
    activities: [],
    skills: [],
    leadFrom: [],
    goodConductCertificate: "undefined" as DocumentStatusType,
    measlesVaccination: "undefined" as DocumentStatusType,
    comments: "",
  };

  const createdAddressIds: number[] = [];
  const createdPostcodeIds: number[] = [];
  const createdDealIds: number[] = [];
  const createdVolunteerIds: number[] = [];

  beforeAll(async () => {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
  });

  afterAll(async () => {
    for (const id of createdVolunteerIds) {
      await getRepository(dataSource, Volunteer).delete({ id });
    }
    for (const id of createdDealIds) {
      await getRepository(dataSource, Deal).delete({ id });
    }
    // Address.person has onDelete: CASCADE, so deleting the Address cascades
    // away the Person row too — delete Address first, skip Person directly.
    for (const id of createdAddressIds) {
      await getRepository(dataSource, Address).delete({ id });
    }
    for (const id of createdPostcodeIds) {
      await getRepository(dataSource, Postcode).delete({ id });
    }
  });

  it("does not clobber a concurrent street edit while still applying the postcode change this flow asked for", async () => {
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const originalPostcode = await getRepository(dataSource, Postcode).save(
      new Postcode({ value: `9${Date.now() % 10000}` }),
    );
    const address = await getRepository(dataSource, Address).save(
      new Address({ street: "Original Street", postcode: originalPostcode }),
    );
    const person = await getRepository(dataSource, Person).save(
      new Person({
        firstName: "Race",
        lastName: `Test-${suffix}`,
        addressId: address.id,
      }),
    );
    createdAddressIds.push(address.id);
    createdPostcodeIds.push(originalPostcode.id);

    const { volunteer, addressReuse } = await parserVolunteerSelfRegister(
      person,
      body,
    );

    expect(addressReuse).toMatchObject({ addressId: address.id });

    // Simulate a concurrent request legitimately editing this same Person's
    // address street in the window between the read above and the write
    // below (several awaited round-trips apart in the real request flow).
    await getRepository(dataSource, Address).update(
      { id: address.id },
      { street: "Concurrently Edited Street" },
    );

    const volunteerId = await writeVolunteerLegacy(volunteer, addressReuse);
    createdVolunteerIds.push(volunteerId);
    createdDealIds.push(volunteer.dealId);

    const updatedAddress = await getRepository(
      dataSource,
      Address,
    ).findOneOrFail({ where: { id: address.id }, relations: ["postcode"] });

    expect(updatedAddress.street).toBe("Concurrently Edited Street");
    expect(updatedAddress.postcode.value).toBe("10115");
  });

  it("applies the postcode idempotently without disturbing a concurrent street edit when it already matches", async () => {
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const postcode10115 = await getRepository(
      dataSource,
      Postcode,
    ).findOneByOrFail({ value: "10115" });
    const address = await getRepository(dataSource, Address).save(
      new Address({
        street: "Already Correct Street",
        postcode: postcode10115,
      }),
    );
    const person = await getRepository(dataSource, Person).save(
      new Person({
        firstName: "NoChange",
        lastName: `Test-${suffix}`,
        addressId: address.id,
      }),
    );
    createdAddressIds.push(address.id);

    const { volunteer, addressReuse } = await parserVolunteerSelfRegister(
      person,
      body,
    );

    expect(addressReuse).toMatchObject({
      addressId: address.id,
      postcodeId: postcode10115.id,
    });

    // Concurrent edit in the same window as above — this only touches
    // street, which this flow never intends to change, so it must survive.
    await getRepository(dataSource, Address).update(
      { id: address.id },
      { street: "Concurrently Edited Street 2" },
    );

    const volunteerId = await writeVolunteerLegacy(volunteer, addressReuse);
    createdVolunteerIds.push(volunteerId);
    createdDealIds.push(volunteer.dealId);

    const updatedAddress = await getRepository(
      dataSource,
      Address,
    ).findOneByOrFail({ id: address.id });
    expect(updatedAddress.street).toBe("Concurrently Edited Street 2");
  });

  it("clones into a fresh Address instead of patching in place when the Address became shared in the meantime (be#1033 review)", async () => {
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const originalPostcode = await getRepository(dataSource, Postcode).save(
      new Postcode({ value: `9${(Date.now() + 1) % 10000}` }),
    );
    const address = await getRepository(dataSource, Address).save(
      new Address({ street: "Shared Later St", postcode: originalPostcode }),
    );
    const person = await getRepository(dataSource, Person).save(
      new Person({
        firstName: "BecomesShared",
        lastName: `Test-${suffix}`,
        addressId: address.id,
      }),
    );
    createdAddressIds.push(address.id);
    createdPostcodeIds.push(originalPostcode.id);

    const { volunteer, addressReuse } = await parserVolunteerSelfRegister(
      person,
      body,
    );
    expect(addressReuse).toMatchObject({ addressId: address.id });

    // Simulate a concurrent flow (e.g. get-or-create-submitter-person)
    // attaching a second Person to this same Address in the window between
    // resolveAddress's decision and writeVolunteerLegacy's write — the
    // Address is no longer exclusively this Person's by the time the write
    // actually happens.
    const otherPerson = await getRepository(dataSource, Person).save(
      new Person({
        firstName: "OtherOwner",
        lastName: `Test-${suffix}`,
        addressId: address.id,
      }),
    );

    const volunteerId = await writeVolunteerLegacy(volunteer, addressReuse);
    createdVolunteerIds.push(volunteerId);
    createdDealIds.push(volunteer.dealId);

    // The now-shared original row must be untouched — otherPerson's address
    // (same row) must still show the original postcode/street, not this
    // registration's postcode.
    const untouchedShared = await getRepository(
      dataSource,
      Address,
    ).findOneOrFail({ where: { id: address.id }, relations: ["postcode"] });
    expect(untouchedShared.street).toBe("Shared Later St");
    expect(untouchedShared.postcode.value).toBe(originalPostcode.value);

    const refreshedOther = await getRepository(
      dataSource,
      Person,
    ).findOneByOrFail({ id: otherPerson.id });
    expect(refreshedOther.addressId).toBe(address.id);

    // This registration's Person must have been repointed to a brand-new,
    // exclusively-owned Address carrying the postcode it asked for.
    const refreshedSelf = await getRepository(
      dataSource,
      Person,
    ).findOneByOrFail({ id: person.id });
    expect(refreshedSelf.addressId).not.toBe(address.id);
    const newAddress = await getRepository(dataSource, Address).findOneOrFail({
      where: { id: refreshedSelf.addressId as number },
      relations: ["postcode"],
    });
    expect(newAddress.postcode.value).toBe("10115");

    createdAddressIds.push(newAddress.id);
    // otherPerson deleted via cascade once address is deleted in afterAll;
    // no separate person cleanup needed (matches the existing convention).
  });
});
