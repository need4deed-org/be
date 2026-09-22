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

// be#1031 review: resolveAddress used to fetch+mutate the Person's existing
// Address in memory and hand it back for a blind full-entity save much later
// in writeVolunteerLegacy — a window in which a concurrent, legitimate edit
// to that same Address (e.g. via PATCH /volunteer/:id) would get silently
// reverted. This exercises the real reuse-existing-address path end to end
// (not mocked) to confirm a concurrent street edit in that window now
// survives, while the postcode change this flow itself asked for still
// lands.
describe("parserVolunteerSelfRegister + writeVolunteerLegacy address handling (be#1031 review)", () => {
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

    const { volunteer, addressWrite } = await parserVolunteerSelfRegister(
      person,
      body,
    );

    expect(addressWrite).toMatchObject({
      action: "patch",
      addressId: address.id,
    });

    // Simulate a concurrent request legitimately editing this same Person's
    // address street in the window between the read above and the write
    // below (several awaited round-trips apart in the real request flow).
    await getRepository(dataSource, Address).update(
      { id: address.id },
      { street: "Concurrently Edited Street" },
    );

    const volunteerId = await writeVolunteerLegacy(volunteer, addressWrite);
    createdVolunteerIds.push(volunteerId);
    createdDealIds.push(volunteer.dealId);

    const updatedAddress = await getRepository(
      dataSource,
      Address,
    ).findOneOrFail({ where: { id: address.id }, relations: ["postcode"] });

    expect(updatedAddress.street).toBe("Concurrently Edited Street");
    expect(updatedAddress.postcode.value).toBe("10115");
  });

  it("skips writing the Address entirely when reused unchanged (postcode already matches)", async () => {
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

    const { volunteer, addressWrite } = await parserVolunteerSelfRegister(
      person,
      body,
    );

    expect(addressWrite).toEqual({ action: "skip" });

    // Concurrent edit in the same window as above — this time nothing this
    // flow does should touch the Address row at all, so it must survive
    // untouched.
    await getRepository(dataSource, Address).update(
      { id: address.id },
      { street: "Concurrently Edited Street 2" },
    );

    const volunteerId = await writeVolunteerLegacy(volunteer, addressWrite);
    createdVolunteerIds.push(volunteerId);
    createdDealIds.push(volunteer.dealId);

    const updatedAddress = await getRepository(
      dataSource,
      Address,
    ).findOneByOrFail({ id: address.id });
    expect(updatedAddress.street).toBe("Concurrently Edited Street 2");
  });
});
