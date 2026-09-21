import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { dataSource } from "../../../data/data-source";
import Deal from "../../../data/entity/deal.entity";
import Address from "../../../data/entity/location/address.entity";
import Postcode from "../../../data/entity/location/postcode.entity";
import Person from "../../../data/entity/person.entity";
import VolunteerAuditLog from "../../../data/entity/volunteer/volunteer-audit-log.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import {
  parseArgs,
  runDedupe,
} from "../../../data/scripts/dedupe-shared-address";
import { DealType } from "../../../data/types";

describe("dedupe-shared-address parseArgs", () => {
  it("defaults to a dry run with no address filter", () => {
    expect(parseArgs([])).toEqual({ apply: false, addressIds: undefined });
  });

  it("recognizes --apply", () => {
    expect(parseArgs(["--apply"])).toEqual({
      apply: true,
      addressIds: undefined,
    });
  });

  it("parses --address-ids as a comma-separated list", () => {
    expect(parseArgs(["--address-ids", "1,2,3"])).toEqual({
      apply: false,
      addressIds: [1, 2, 3],
    });
  });
});

describe("runDedupe (be#1028)", () => {
  let postcode: Postcode;
  let addressBlank: Address;
  let addressRealWithSignal: Address;
  let addressRealNoSignal: Address;
  let personsBlank: Person[];
  let personRealSignalOwner: Person;
  let personRealSignalOther: Person;
  let personsRealNoSignal: Person[];
  let deal: Deal;
  let volunteer: Volunteer;
  let auditLog: VolunteerAuditLog;

  const addressRepository = () => dataSource.getRepository(Address);
  const personRepository = () => dataSource.getRepository(Person);

  beforeAll(async () => {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    postcode = await dataSource
      .getRepository(Postcode)
      .findOneOrFail({ where: {} });

    // Group A: blank, shared by 3 — nobody is a confident keeper, but
    // there's nothing real to lose either.
    addressBlank = await addressRepository().save(
      new Address({ street: "", postcode }),
    );
    personsBlank = await personRepository().save([
      new Person({
        firstName: "Blank-1",
        email: `blank-1-${suffix}@example.test`,
        addressId: addressBlank.id,
      }),
      new Person({
        firstName: "Blank-2",
        email: `blank-2-${suffix}@example.test`,
        addressId: addressBlank.id,
      }),
      new Person({
        firstName: "Blank-3",
        email: `blank-3-${suffix}@example.test`,
        addressId: addressBlank.id,
      }),
    ]);

    // Group B: real data, shared by 2, one has a contact_details_changed
    // audit entry — that one is the best-guess keeper.
    addressRealWithSignal = await addressRepository().save(
      new Address({ street: "123 Real St", postcode }),
    );
    [personRealSignalOwner, personRealSignalOther] =
      await personRepository().save([
        new Person({
          firstName: "Signal-Owner",
          email: `signal-owner-${suffix}@example.test`,
          addressId: addressRealWithSignal.id,
        }),
        new Person({
          firstName: "Signal-Other",
          email: `signal-other-${suffix}@example.test`,
          addressId: addressRealWithSignal.id,
        }),
      ]);
    deal = await dataSource
      .getRepository(Deal)
      .save(new Deal({ type: DealType.VOLUNTEER, postcodeId: postcode.id }));
    volunteer = await dataSource
      .getRepository(Volunteer)
      .save(
        new Volunteer({ dealId: deal.id, personId: personRealSignalOwner.id }),
      );
    auditLog = await dataSource.getRepository(VolunteerAuditLog).save(
      new VolunteerAuditLog({
        volunteerId: volunteer.id,
        type: "contact_details_changed",
        detail: "Contact details updated.",
        occurredAt: new Date(),
      }),
    );

    // Group C: real data, shared by 2, nobody has any audit signal — needs
    // manual attribution, nobody keeps it.
    addressRealNoSignal = await addressRepository().save(
      new Address({ street: "456 Nobody St", postcode }),
    );
    personsRealNoSignal = await personRepository().save([
      new Person({
        firstName: "NoSignal-1",
        email: `no-signal-1-${suffix}@example.test`,
        addressId: addressRealNoSignal.id,
      }),
      new Person({
        firstName: "NoSignal-2",
        email: `no-signal-2-${suffix}@example.test`,
        addressId: addressRealNoSignal.id,
      }),
    ]);
  });

  afterAll(async () => {
    await dataSource
      .getRepository(VolunteerAuditLog)
      .delete({ id: auditLog.id });
    await dataSource.getRepository(Volunteer).delete({ id: volunteer.id });
    await dataSource.getRepository(Deal).delete({ id: deal.id });

    const allPersonIds = [
      ...personsBlank.map((p) => p.id),
      personRealSignalOwner.id,
      personRealSignalOther.id,
      ...personsRealNoSignal.map((p) => p.id),
    ];
    const refreshed = await personRepository().find({
      where: allPersonIds.map((id) => ({ id })),
    });
    const newAddressIds = new Set(
      refreshed
        .map((p) => p.addressId)
        .filter(
          (id): id is number =>
            !!id &&
            ![
              addressBlank.id,
              addressRealWithSignal.id,
              addressRealNoSignal.id,
            ].includes(id),
        ),
    );

    await personRepository().delete(allPersonIds);
    for (const id of newAddressIds) {
      await addressRepository().delete({ id });
    }
    await addressRepository().delete({ id: addressBlank.id });
    await addressRepository().delete({ id: addressRealWithSignal.id });
    await addressRepository().delete({ id: addressRealNoSignal.id });
  });

  const scopedAddressIds = () => [
    addressBlank.id,
    addressRealWithSignal.id,
    addressRealNoSignal.id,
  ];

  it("dry run reports the correct plan without writing anything", async () => {
    const report = await runDedupe(dataSource, {
      apply: false,
      addressIds: scopedAddressIds(),
    });

    const blankGroup = report.groups.find(
      (g) => g.addressId === addressBlank.id,
    );
    expect(blankGroup).toMatchObject({
      blank: true,
      keeperPersonId: null,
    });
    expect(blankGroup?.repointedPersonIds.sort()).toEqual(
      personsBlank.map((p) => p.id).sort(),
    );

    const signalGroup = report.groups.find(
      (g) => g.addressId === addressRealWithSignal.id,
    );
    expect(signalGroup?.blank).toBe(false);
    expect(signalGroup?.keeperPersonId).toBe(personRealSignalOwner.id);
    expect(signalGroup?.repointedPersonIds).toEqual([personRealSignalOther.id]);

    const noSignalGroup = report.groups.find(
      (g) => g.addressId === addressRealNoSignal.id,
    );
    expect(noSignalGroup?.keeperPersonId).toBeNull();
    expect(noSignalGroup?.repointedPersonIds.sort()).toEqual(
      personsRealNoSignal.map((p) => p.id).sort(),
    );

    expect(report.needsManualAttribution.map((g) => g.addressId)).toEqual([
      addressRealNoSignal.id,
    ]);

    // Nothing written.
    const stillShared = await personRepository().find({
      where: { addressId: addressBlank.id },
    });
    expect(stillShared).toHaveLength(3);
  });

  it("--apply repoints everyone but the keeper, never mutating the original row", async () => {
    await runDedupe(dataSource, {
      apply: true,
      addressIds: scopedAddressIds(),
    });

    // Group A: blank, nobody kept — all three get their own new address.
    const refreshedBlank = await personRepository().find({
      where: personsBlank.map((p) => ({ id: p.id })),
    });
    const blankAddressIds = new Set(refreshedBlank.map((p) => p.addressId));
    expect(blankAddressIds.size).toBe(3);
    expect(blankAddressIds.has(addressBlank.id)).toBe(false);
    const untouchedBlank = await addressRepository().findOneByOrFail({
      id: addressBlank.id,
    });
    expect(untouchedBlank.street).toBe("");

    // Group B: signal owner keeps the row, the other gets a fresh one.
    const refreshedOwner = await personRepository().findOneByOrFail({
      id: personRealSignalOwner.id,
    });
    const refreshedOther = await personRepository().findOneByOrFail({
      id: personRealSignalOther.id,
    });
    expect(refreshedOwner.addressId).toBe(addressRealWithSignal.id);
    expect(refreshedOther.addressId).not.toBe(addressRealWithSignal.id);
    const untouchedSignalAddress = await addressRepository().findOneByOrFail({
      id: addressRealWithSignal.id,
    });
    expect(untouchedSignalAddress.street).toBe("123 Real St");
    const newOtherAddress = await addressRepository().findOneByOrFail({
      id: refreshedOther.addressId as number,
    });
    expect(newOtherAddress.street).toBeFalsy();

    // Group C: nobody kept — original row now fully orphaned, untouched.
    const refreshedNoSignal = await personRepository().find({
      where: personsRealNoSignal.map((p) => ({ id: p.id })),
    });
    for (const person of refreshedNoSignal) {
      expect(person.addressId).not.toBe(addressRealNoSignal.id);
    }
    const untouchedNoSignalAddress = await addressRepository().findOneByOrFail({
      id: addressRealNoSignal.id,
    });
    expect(untouchedNoSignalAddress.street).toBe("456 Nobody St");
    const remainingReferences = await personRepository().count({
      where: { addressId: addressRealNoSignal.id },
    });
    expect(remainingReferences).toBe(0);
  });
});
