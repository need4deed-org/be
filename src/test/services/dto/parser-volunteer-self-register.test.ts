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
import { randomNumericSuffix } from "../../random";

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
  const createdPersonIds: number[] = [];

  const findPostcode10115 = () =>
    getRepository(dataSource, Postcode).findOneByOrFail({ value: "10115" });

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
    for (const id of createdAddressIds) {
      await getRepository(dataSource, Address).delete({ id });
    }
    for (const id of createdPersonIds) {
      await getRepository(dataSource, Person).delete({ id });
    }
    for (const id of createdPostcodeIds) {
      await getRepository(dataSource, Postcode).delete({ id });
    }
  });

  it("does not clobber a concurrent street edit while still applying the postcode change this flow asked for", async () => {
    const suffix = randomNumericSuffix();
    const originalPostcode = await getRepository(dataSource, Postcode).save(
      new Postcode({ value: `9${randomNumericSuffix()}` }),
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

    const { volunteer, addressPostcodeId } = await parserVolunteerSelfRegister(
      person,
      body,
    );
    expect(addressPostcodeId).toBe((await findPostcode10115()).id);

    await getRepository(dataSource, Address).update(
      { id: address.id },
      { street: "Concurrently Edited Street" },
    );

    const volunteerId = await writeVolunteerLegacy(
      volunteer,
      addressPostcodeId,
    );
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
    const suffix = randomNumericSuffix();
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

    const { volunteer, addressPostcodeId } = await parserVolunteerSelfRegister(
      person,
      body,
    );

    expect(addressPostcodeId).toBe(postcode10115.id);

    await getRepository(dataSource, Address).update(
      { id: address.id },
      { street: "Concurrently Edited Street 2" },
    );

    const volunteerId = await writeVolunteerLegacy(
      volunteer,
      addressPostcodeId,
    );
    createdVolunteerIds.push(volunteerId);
    createdDealIds.push(volunteer.dealId);

    const updatedAddress = await getRepository(
      dataSource,
      Address,
    ).findOneByOrFail({ id: address.id });
    expect(updatedAddress.street).toBe("Concurrently Edited Street 2");
  });

  it("clones into a fresh Address instead of patching in place when the Address became shared in the meantime (be#1033 review)", async () => {
    const suffix = randomNumericSuffix();
    const originalPostcode = await getRepository(dataSource, Postcode).save(
      new Postcode({ value: `9${randomNumericSuffix()}` }),
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

    const { volunteer, addressPostcodeId } = await parserVolunteerSelfRegister(
      person,
      body,
    );
    expect(addressPostcodeId).toBe((await findPostcode10115()).id);
    const otherPerson = await getRepository(dataSource, Person).save(
      new Person({
        firstName: "OtherOwner",
        lastName: `Test-${suffix}`,
        addressId: address.id,
      }),
    );

    const volunteerId = await writeVolunteerLegacy(
      volunteer,
      addressPostcodeId,
    );
    createdVolunteerIds.push(volunteerId);
    createdDealIds.push(volunteer.dealId);

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
  });

  it("keeps a concurrent edit to the Person's own columns", async () => {
    const suffix = randomNumericSuffix();
    const address = await getRepository(dataSource, Address).save(
      new Address({
        street: "Own Column St",
        postcode: await findPostcode10115(),
      }),
    );
    const person = await getRepository(dataSource, Person).save(
      new Person({
        firstName: "Stale",
        lastName: `Test-${suffix}`,
        phone: "000",
        addressId: address.id,
      }),
    );
    createdAddressIds.push(address.id);

    const { volunteer, addressPostcodeId } = await parserVolunteerSelfRegister(
      person,
      body,
    );

    await getRepository(dataSource, Person).update(
      { id: person.id },
      { firstName: "Fresh", phone: "111" },
    );

    const volunteerId = await writeVolunteerLegacy(
      volunteer,
      addressPostcodeId,
    );
    createdVolunteerIds.push(volunteerId);
    createdDealIds.push(volunteer.dealId);

    const refreshed = await getRepository(dataSource, Person).findOneByOrFail({
      id: person.id,
    });
    expect(refreshed.firstName).toBe("Fresh");
    expect(refreshed.phone).toBe("111");
    expect(refreshed.addressId).toBe(address.id);
  });

  it("applies the postcode to the Person's current Address, not the one it had when the request started", async () => {
    const suffix = randomNumericSuffix();
    const originalPostcode = await getRepository(dataSource, Postcode).save(
      new Postcode({ value: `9${randomNumericSuffix()}` }),
    );
    const staleAddress = await getRepository(dataSource, Address).save(
      new Address({ street: "Stale St", postcode: originalPostcode }),
    );
    const currentAddress = await getRepository(dataSource, Address).save(
      new Address({ street: "Current St", postcode: originalPostcode }),
    );
    const person = await getRepository(dataSource, Person).save(
      new Person({
        firstName: "Moved",
        lastName: `Test-${suffix}`,
        addressId: staleAddress.id,
      }),
    );
    createdAddressIds.push(staleAddress.id, currentAddress.id);
    createdPostcodeIds.push(originalPostcode.id);

    const { volunteer, addressPostcodeId } = await parserVolunteerSelfRegister(
      person,
      body,
    );

    await getRepository(dataSource, Person).update(
      { id: person.id },
      { addressId: currentAddress.id },
    );

    const volunteerId = await writeVolunteerLegacy(
      volunteer,
      addressPostcodeId,
    );
    createdVolunteerIds.push(volunteerId);
    createdDealIds.push(volunteer.dealId);

    const refreshed = await getRepository(dataSource, Person).findOneByOrFail({
      id: person.id,
    });
    expect(refreshed.addressId).toBe(currentAddress.id);
    expect(volunteer.person.address.id).toBe(currentAddress.id);

    const current = await getRepository(dataSource, Address).findOneOrFail({
      where: { id: currentAddress.id },
      relations: ["postcode"],
    });
    expect(current.street).toBe("Current St");
    expect(current.postcode.value).toBe("10115");

    const stale = await getRepository(dataSource, Address).findOneOrFail({
      where: { id: staleAddress.id },
      relations: ["postcode"],
    });
    expect(stale.postcode.value).toBe(originalPostcode.value);
  });

  it("creates and links a fresh Address when the Person has none", async () => {
    const suffix = randomNumericSuffix();
    const person = await getRepository(dataSource, Person).save(
      new Person({ firstName: "NoAddress", lastName: `Test-${suffix}` }),
    );
    createdPersonIds.push(person.id);

    const { volunteer, addressPostcodeId } = await parserVolunteerSelfRegister(
      person,
      body,
    );

    const volunteerId = await writeVolunteerLegacy(
      volunteer,
      addressPostcodeId,
    );
    createdVolunteerIds.push(volunteerId);
    createdDealIds.push(volunteer.dealId);
    createdAddressIds.push(volunteer.person.address.id);

    const refreshed = await getRepository(dataSource, Person).findOneByOrFail({
      id: person.id,
    });
    expect(refreshed.addressId).toBe(volunteer.person.address.id);
    const address = await getRepository(dataSource, Address).findOneOrFail({
      where: { id: refreshed.addressId as number },
      relations: ["postcode"],
    });
    expect(address.postcode.value).toBe("10115");
  });
});
