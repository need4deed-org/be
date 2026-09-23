import { In } from "typeorm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { dataSource } from "../../../data/data-source";
import Deal from "../../../data/entity/deal.entity";
import Address from "../../../data/entity/location/address.entity";
import Postcode from "../../../data/entity/location/postcode.entity";
import Person from "../../../data/entity/person.entity";
import VolunteerAuditLog from "../../../data/entity/volunteer/volunteer-audit-log.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import {
  parseArgs,
  processGroup,
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

  it("rejects --address-ids with no value instead of silently disabling the filter", () => {
    expect(() => parseArgs(["--address-ids"])).toThrow(
      "--address-ids requires a comma-separated list of ids",
    );
    expect(() => parseArgs(["--address-ids", "--apply"])).toThrow(
      "--address-ids requires a comma-separated list of ids",
    );
  });

  it("rejects a malformed --address-ids value instead of silently coercing it", () => {
    expect(() => parseArgs(["--address-ids", "1,,3"])).toThrow(
      "--address-ids must be a comma-separated list of positive integers",
    );
    expect(() => parseArgs(["--address-ids", "abc"])).toThrow(
      "--address-ids must be a comma-separated list of positive integers",
    );
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

  it("does not overwrite a Person whose addressId already moved before the write lands (be#1028 review: TOCTOU)", async () => {
    const raceSuffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    // A Postcode only this test uses: processGroup's replacement Address
    // inherits the shared row's postcode, so counting Addresses on it
    // measures exactly this test's writes — a whole-table count also picks
    // up rows other test files insert concurrently (be#999).
    const racePostcode = await dataSource
      .getRepository(Postcode)
      .save(new Postcode({ value: `race-${raceSuffix}` }));
    const countRaceAddresses = () =>
      addressRepository().count({ where: { postcodeId: racePostcode.id } });
    const raceAddress = await addressRepository().save(
      new Address({ street: "", postcode: racePostcode }),
    );
    const movedAwayAddress = await addressRepository().save(
      new Address({ street: "", postcode: racePostcode }),
    );
    const [personMovedAway, personStillShared] = await personRepository().save([
      new Person({
        firstName: "Race-Moved",
        email: `race-moved-${raceSuffix}@example.test`,
        addressId: raceAddress.id,
      }),
      new Person({
        firstName: "Race-Shared",
        email: `race-shared-${raceSuffix}@example.test`,
        addressId: raceAddress.id,
      }),
    ]);

    // Simulate a concurrent write (the live app, or another batched run)
    // repointing personMovedAway off the shared row *after* the group scan
    // already captured both ids below.
    await personRepository().update(
      { id: personMovedAway.id },
      { addressId: movedAwayAddress.id },
    );

    const addressCountBefore = await countRaceAddresses();

    const result = await processGroup(
      dataSource.manager,
      raceAddress.id,
      [personMovedAway.id, personStillShared.id],
      true,
    );

    expect(result.staleAddressPersonIds).toEqual([personMovedAway.id]);
    expect(result.repointedPersonIds).toEqual([personStillShared.id]);

    // be#1032 review: the replacement Address created for personMovedAway
    // before the guard caught the race must not be left behind as a
    // permanent, untracked orphan. Net change should be exactly +1 (the one
    // new Address personStillShared was actually repointed to) — not +2,
    // which is what a leaked orphan from the stale attempt would produce.
    expect(await countRaceAddresses()).toBe(addressCountBefore + 1);

    const refreshedMovedAway = await personRepository().findOneByOrFail({
      id: personMovedAway.id,
    });
    expect(refreshedMovedAway.addressId).toBe(movedAwayAddress.id);

    const refreshedStillShared = await personRepository().findOneByOrFail({
      id: personStillShared.id,
    });
    expect(refreshedStillShared.addressId).not.toBe(raceAddress.id);

    await personRepository().delete([personMovedAway.id, personStillShared.id]);
    await addressRepository().delete({
      id: In([
        raceAddress.id,
        movedAwayAddress.id,
        refreshedStillShared.addressId as number,
      ]),
    });
    await dataSource.getRepository(Postcode).delete({ id: racePostcode.id });
  });

  it("does not credit a keeper who already moved off the shared row, and surfaces it for manual attribution instead (be#1032 review)", async () => {
    const staleAddress = await addressRepository().save(
      new Address({ street: "789 Stale Owner St", postcode }),
    );
    const elsewhereAddress = await addressRepository().save(
      new Address({ street: "", postcode }),
    );
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const [staleKeeper, otherPerson] = await personRepository().save([
      new Person({
        firstName: "Stale-Keeper",
        email: `stale-keeper-${suffix}@example.test`,
        addressId: staleAddress.id,
      }),
      new Person({
        firstName: "Other",
        email: `other-${suffix}@example.test`,
        addressId: staleAddress.id,
      }),
    ]);
    const staleDeal = await dataSource
      .getRepository(Deal)
      .save(new Deal({ type: DealType.VOLUNTEER, postcodeId: postcode.id }));
    const staleVolunteer = await dataSource
      .getRepository(Volunteer)
      .save(new Volunteer({ dealId: staleDeal.id, personId: staleKeeper.id }));
    const staleAuditLog = await dataSource
      .getRepository(VolunteerAuditLog)
      .save(
        new VolunteerAuditLog({
          volunteerId: staleVolunteer.id,
          type: "contact_details_changed",
          detail: "Contact details updated.",
          occurredAt: new Date(),
        }),
      );

    // staleKeeper has the strongest keeper signal, but has already moved off
    // staleAddress by the time this group is processed (be#1032 review).
    await personRepository().update(
      { id: staleKeeper.id },
      { addressId: elsewhereAddress.id },
    );

    const result = await processGroup(
      dataSource.manager,
      staleAddress.id,
      [staleKeeper.id, otherPerson.id],
      false,
    );

    expect(result.keeperPersonId).toBeNull();
    expect(result.keeperReason).toBeNull();

    await dataSource
      .getRepository(VolunteerAuditLog)
      .delete({ id: staleAuditLog.id });
    await dataSource.getRepository(Volunteer).delete({ id: staleVolunteer.id });
    await dataSource.getRepository(Deal).delete({ id: staleDeal.id });
    await personRepository().delete([staleKeeper.id, otherPerson.id]);
    await addressRepository().delete({
      id: In([staleAddress.id, elsewhereAddress.id]),
    });
  });

  it("breaks a tie on occurredAt deterministically by the more recently-inserted audit entry (be#1032 review)", async () => {
    const tiedAddress = await addressRepository().save(
      new Address({ street: "1 Tied St", postcode }),
    );
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const [earlierRowPerson, laterRowPerson] = await personRepository().save([
      new Person({
        firstName: "Tied-Earlier-Row",
        email: `tied-earlier-${suffix}@example.test`,
        addressId: tiedAddress.id,
      }),
      new Person({
        firstName: "Tied-Later-Row",
        email: `tied-later-${suffix}@example.test`,
        addressId: tiedAddress.id,
      }),
    ]);
    const tiedDeal = await dataSource
      .getRepository(Deal)
      .save(new Deal({ type: DealType.VOLUNTEER, postcodeId: postcode.id }));
    const [earlierVolunteer, laterVolunteer] = await dataSource
      .getRepository(Volunteer)
      .save([
        new Volunteer({ dealId: tiedDeal.id, personId: earlierRowPerson.id }),
        new Volunteer({ dealId: tiedDeal.id, personId: laterRowPerson.id }),
      ]);

    const tiedTimestamp = new Date();
    const [earlierAuditLog, laterAuditLog] = await dataSource
      .getRepository(VolunteerAuditLog)
      .save([
        new VolunteerAuditLog({
          volunteerId: earlierVolunteer.id,
          type: "contact_details_changed",
          detail: "Contact details updated.",
          occurredAt: tiedTimestamp,
        }),
        new VolunteerAuditLog({
          volunteerId: laterVolunteer.id,
          type: "contact_details_changed",
          detail: "Contact details updated.",
          occurredAt: tiedTimestamp,
        }),
      ]);
    // Inserted after earlierAuditLog, so it has the higher id — the
    // deterministic tiebreaker.
    expect(laterAuditLog.id).toBeGreaterThan(earlierAuditLog.id);

    const result = await processGroup(
      dataSource.manager,
      tiedAddress.id,
      [earlierRowPerson.id, laterRowPerson.id],
      false,
    );

    expect(result.keeperPersonId).toBe(laterRowPerson.id);

    await dataSource
      .getRepository(VolunteerAuditLog)
      .delete({ id: In([earlierAuditLog.id, laterAuditLog.id]) });
    await dataSource
      .getRepository(Volunteer)
      .delete({ id: In([earlierVolunteer.id, laterVolunteer.id]) });
    await dataSource.getRepository(Deal).delete({ id: tiedDeal.id });
    await personRepository().delete([earlierRowPerson.id, laterRowPerson.id]);
    await addressRepository().delete({ id: tiedAddress.id });
  });

  it("commits each group in its own transaction instead of one transaction for the whole run (be#1032 review)", async () => {
    const addressX = await addressRepository().save(
      new Address({ street: "", postcode }),
    );
    const addressY = await addressRepository().save(
      new Address({ street: "", postcode }),
    );
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const personsX = await personRepository().save([
      new Person({
        firstName: "Txn-X-1",
        email: `txn-x-1-${suffix}@example.test`,
        addressId: addressX.id,
      }),
      new Person({
        firstName: "Txn-X-2",
        email: `txn-x-2-${suffix}@example.test`,
        addressId: addressX.id,
      }),
    ]);
    const personsY = await personRepository().save([
      new Person({
        firstName: "Txn-Y-1",
        email: `txn-y-1-${suffix}@example.test`,
        addressId: addressY.id,
      }),
      new Person({
        firstName: "Txn-Y-2",
        email: `txn-y-2-${suffix}@example.test`,
        addressId: addressY.id,
      }),
    ]);

    const txnSpy = vi.spyOn(dataSource, "transaction");
    await runDedupe(dataSource, {
      apply: true,
      addressIds: [addressX.id, addressY.id],
    });

    // One transaction per group (addressX, addressY), not one for the
    // entire run — a failure processing one group must not have the power
    // to roll back another, already-correctly-guarded group. Asserted
    // before mockRestore(), which clears recorded call history.
    expect(txnSpy).toHaveBeenCalledTimes(2);
    txnSpy.mockRestore();

    const refreshedX = await personRepository().find({
      where: personsX.map((p) => ({ id: p.id })),
    });
    for (const person of refreshedX) {
      expect(person.addressId).not.toBe(addressX.id);
    }

    const newAddressIds = [
      ...refreshedX.map((p) => p.addressId as number),
      ...(
        await personRepository().find({
          where: personsY.map((p) => ({ id: p.id })),
        })
      ).map((p) => p.addressId as number),
    ];
    await personRepository().delete([
      ...personsX.map((p) => p.id),
      ...personsY.map((p) => p.id),
    ]);
    await addressRepository().delete({
      id: In([addressX.id, addressY.id, ...newAddressIds]),
    });
  });

  it("treats a row with a blank street but a real city as non-blank (be#1032 review)", async () => {
    const cityOnlyAddress = await addressRepository().save(
      new Address({ street: "", city: "Berlin", postcode }),
    );
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const [personCity1, personCity2] = await personRepository().save([
      new Person({
        firstName: "City-1",
        email: `city-1-${suffix}@example.test`,
        addressId: cityOnlyAddress.id,
      }),
      new Person({
        firstName: "City-2",
        email: `city-2-${suffix}@example.test`,
        addressId: cityOnlyAddress.id,
      }),
    ]);

    const result = await processGroup(
      dataSource.manager,
      cityOnlyAddress.id,
      [personCity1.id, personCity2.id],
      false,
    );

    expect(result.blank).toBe(false);
    // No Volunteer/audit signal exists for either person, so nobody is a
    // confident keeper — this must surface for manual attribution rather
    // than being silently discarded as if the row had nothing real on it.
    expect(result.keeperPersonId).toBeNull();

    await personRepository().delete([personCity1.id, personCity2.id]);
    await addressRepository().delete({ id: cityOnlyAddress.id });
  });

  it("does not abort remaining groups when one group's processing throws (be#1032 review)", async () => {
    const addressOk = await addressRepository().save(
      new Address({ street: "", postcode }),
    );
    const addressBad = await addressRepository().save(
      new Address({ street: "", postcode }),
    );
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const personsOk = await personRepository().save([
      new Person({
        firstName: "Err-Ok-1",
        email: `err-ok-1-${suffix}@example.test`,
        addressId: addressOk.id,
      }),
      new Person({
        firstName: "Err-Ok-2",
        email: `err-ok-2-${suffix}@example.test`,
        addressId: addressOk.id,
      }),
    ]);
    const personsBad = await personRepository().save([
      new Person({
        firstName: "Err-Bad-1",
        email: `err-bad-1-${suffix}@example.test`,
        addressId: addressBad.id,
      }),
      new Person({
        firstName: "Err-Bad-2",
        email: `err-bad-2-${suffix}@example.test`,
        addressId: addressBad.id,
      }),
    ]);

    // Dry-run processes every group through the same `dataSource.manager`
    // (see runDedupe), so a single narrow spy on this one lookup — thrown
    // only for addressBad's id — simulates a concurrently-deleted Address
    // for exactly one group without touching any other group's processing.
    const addrRepo = dataSource.manager.getRepository(Address);
    const originalFindOneByOrFail = addrRepo.findOneByOrFail.bind(addrRepo);
    const findSpy = vi
      .spyOn(addrRepo, "findOneByOrFail")
      .mockImplementation(async (where) => {
        if ((where as { id?: number })?.id === addressBad.id) {
          throw new Error("simulated: Address concurrently deleted");
        }
        return originalFindOneByOrFail(where);
      });

    try {
      const report = await runDedupe(dataSource, {
        apply: false,
        addressIds: [addressOk.id, addressBad.id],
      });

      expect(report.erroredGroups).toEqual([
        {
          addressId: addressBad.id,
          error: "simulated: Address concurrently deleted",
        },
      ]);
      const okGroup = report.groups.find((g) => g.addressId === addressOk.id);
      expect(okGroup?.repointedPersonIds.sort()).toEqual(
        personsOk.map((p) => p.id).sort(),
      );
      expect(report.groups.some((g) => g.addressId === addressBad.id)).toBe(
        false,
      );
    } finally {
      findSpy.mockRestore();
    }

    await personRepository().delete([
      ...personsOk.map((p) => p.id),
      ...personsBad.map((p) => p.id),
    ]);
    await addressRepository().delete({ id: In([addressOk.id, addressBad.id]) });
  });
});
