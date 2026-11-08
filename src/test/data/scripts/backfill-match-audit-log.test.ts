import { OpportunityVolunteerStatusType } from "need4deed-sdk";
import { EntityManager, QueryRunner } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { dataSource } from "../../../data/data-source";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import VolunteerAuditLog from "../../../data/entity/volunteer/volunteer-audit-log.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import {
  backfill,
  findCutoff,
  MatchRow,
  parseArgs,
  planMatchEntries,
} from "../../../data/scripts/backfill-match-audit-log";
import { randomNumericSuffix } from "../../random";
import { createOpportunity, createVolunteer } from "../match-fixtures";

const { MATCHED, ACTIVE } = OpportunityVolunteerStatusType;

describe("backfill-match-audit-log parseArgs", () => {
  it("defaults to a dry run with no imported days", () => {
    expect(parseArgs([])).toEqual({ apply: false, importedOn: [] });
  });

  it("recognizes --apply and --imported-on", () => {
    expect(
      parseArgs(["--imported-on", "2026-01-28,2026-05-27", "--apply"]),
    ).toEqual({ apply: true, importedOn: ["2026-01-28", "2026-05-27"] });
  });

  it("rejects --imported-on with no value", () => {
    expect(() => parseArgs(["--imported-on"])).toThrow(
      "--imported-on requires a comma-separated list of dates",
    );
    expect(() => parseArgs(["--imported-on", "--apply"])).toThrow(
      "--imported-on requires a comma-separated list of dates",
    );
  });

  it("rejects unknown arguments, including the --flag=value form", () => {
    expect(() => parseArgs(["--imported-on=2026-05-27", "--apply"])).toThrow(
      "Unknown argument(s): --imported-on=2026-05-27",
    );
    expect(() => parseArgs(["--aply"])).toThrow("Unknown argument(s): --aply");
  });

  it("parses --cutoff and requires a zone", () => {
    expect(parseArgs(["--cutoff", "2026-10-07T09:00:00Z"])).toEqual({
      apply: false,
      importedOn: [],
      cutoff: new Date("2026-10-07T09:00:00Z"),
    });
    expect(parseArgs(["--cutoff", "2026-10-07T11:00:00+02:00"]).cutoff).toEqual(
      new Date("2026-10-07T09:00:00Z"),
    );
    expect(() => parseArgs(["--cutoff", "2026-10-07T09:00:00"])).toThrow(
      '--cutoff must be an ISO timestamp with a zone, got "2026-10-07T09:00:00"',
    );
    expect(() => parseArgs(["--cutoff"])).toThrow(
      "--cutoff requires an ISO timestamp",
    );
  });

  it("rejects malformed and impossible dates", () => {
    expect(() => parseArgs(["--imported-on", "2026-1-5"])).toThrow(
      '--imported-on must be YYYY-MM-DD dates, got "2026-1-5"',
    );
    expect(() => parseArgs(["--imported-on", "2026-05-27,2026-02-30"])).toThrow(
      '--imported-on must be YYYY-MM-DD dates, got "2026-02-30"',
    );
  });
});

describe("backfill-match-audit-log planMatchEntries", () => {
  const cutoff = new Date("2026-10-07T12:00:00Z");
  const createdAt = new Date("2026-03-10T12:00:00Z");
  const match = (overrides: Partial<MatchRow> = {}): MatchRow => ({
    id: 7,
    volunteerId: 11,
    opportunityId: 13,
    title: "Kleiderkammer",
    status: MATCHED,
    createdAt,
    updatedAt: createdAt,
    createdOn: "2026-03-10",
    ...overrides,
  });

  it("links with the current status when the match was never updated", () => {
    expect(planMatchEntries(match(), cutoff, [])).toEqual([
      {
        volunteerId: 11,
        kind: "linked",
        imported: false,
        detail: 'Linked to opportunity "Kleiderkammer" as opp-matched.',
        occurredAt: createdAt,
      },
    ]);
  });

  it("links without a status and adds the change when updated before the cutoff", () => {
    const updatedAt = new Date("2026-06-01T12:00:00Z");
    expect(
      planMatchEntries(match({ status: ACTIVE, updatedAt }), cutoff, []).map(
        ({ detail, occurredAt }) => ({ detail, occurredAt }),
      ),
    ).toEqual([
      {
        detail: 'Linked to opportunity "Kleiderkammer".',
        occurredAt: createdAt,
      },
      {
        detail: 'Opportunity "Kleiderkammer" status changed to opp-active.',
        occurredAt: updatedAt,
      },
    ]);
  });

  it("only links when the update is at or after the cutoff (already logged)", () => {
    for (const updatedAt of [cutoff, new Date("2026-10-20T12:00:00Z")]) {
      expect(
        planMatchEntries(match({ status: ACTIVE, updatedAt }), cutoff, []).map(
          ({ detail }) => detail,
        ),
      ).toEqual(['Linked to opportunity "Kleiderkammer".']);
    }
  });

  it("marks only the Linked entry of a match created on an imported day (DB date)", () => {
    const updatedAt = new Date("2026-06-01T12:00:00Z");
    expect(
      planMatchEntries(match({ updatedAt }), cutoff, [
        "2026-01-28",
        "2026-03-10",
      ]).map(({ detail }) => detail),
    ).toEqual([
      'Linked to opportunity "Kleiderkammer" (imported).',
      'Opportunity "Kleiderkammer" status changed to opp-matched.',
    ]);
    expect(
      planMatchEntries(match({ createdOn: "2026-03-11" }), cutoff, [
        "2026-03-10",
      ])[0].detail,
    ).toBe('Linked to opportunity "Kleiderkammer" as opp-matched.');
  });

  it("falls back to #<opportunityId> without a title", () => {
    expect(planMatchEntries(match({ title: null }), cutoff, [])[0].detail).toBe(
      'Linked to opportunity "#13" as opp-matched.',
    );
  });
});

// Sweeps every match in the shared test DB, so it runs in a rolled-back transaction.
describe("backfill-match-audit-log backfill", () => {
  const suffix = randomNumericSuffix();
  const createdOn = "2020-01-15";
  let queryRunner: QueryRunner;
  let manager: EntityManager;
  const v: Record<string, Volunteer> = {};
  const o: Record<string, Opportunity> = {};
  const m: Record<string, OpportunityVolunteer> = {};

  const insertMatch = async (
    volunteer: Volunteer,
    opportunity: Opportunity,
    status: OpportunityVolunteerStatusType,
    updatedAt: string,
  ) => {
    const [{ id }] = await manager.query(
      `INSERT INTO opportunity_volunteer (volunteer_id, opportunity_id, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [volunteer.id, opportunity.id, status, `${createdOn} 12:00`, updatedAt],
    );
    return manager.findOneByOrFail(OpportunityVolunteer, { id });
  };

  const entriesOf = (volunteer: Volunteer) =>
    manager.find(VolunteerAuditLog, {
      where: {
        volunteerId: volunteer.id,
        type: "opportunity_status_changed",
      },
      order: { occurredAt: "ASC", id: "ASC" },
    });

  const ownPlanned = <T extends { volunteerId: number }>(planned: T[]) =>
    planned.filter(({ volunteerId }) =>
      Object.values(v).some(({ id }) => id === volunteerId),
    );

  beforeAll(async () => {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
    queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    manager = queryRunner.manager;

    const liveEntries = await manager.countBy(VolunteerAuditLog, {
      type: "opportunity_status_changed",
    });
    if (!liveEntries) {
      await manager.save(
        new VolunteerAuditLog({
          volunteerId: (await createVolunteer(manager)).id,
          type: "opportunity_status_changed",
          detail: "Live entry.",
          occurredAt: new Date(),
        }),
      );
    }

    for (const key of ["fresh", "changed", "linked", "twin"]) {
      v[key] = await createVolunteer(manager);
      o[key] = await createOpportunity(manager, `Backfill ${key} ${suffix}`);
    }
    m.fresh = await insertMatch(
      v.fresh,
      o.fresh,
      MATCHED,
      `${createdOn} 12:00`,
    );
    m.changed = await insertMatch(
      v.changed,
      o.changed,
      ACTIVE,
      "2020-06-01 12:00",
    );
    m.twin = await insertMatch(v.twin, o.twin, MATCHED, `${createdOn} 12:00`);
    await manager.save(
      new VolunteerAuditLog({
        volunteerId: v.twin.id,
        type: "opportunity_status_changed",
        detail: `Linked to opportunity "${o.twin.title}" as opp-pending.`,
        occurredAt: new Date(),
      }),
    );
    m.linked = await insertMatch(
      v.linked,
      o.linked,
      MATCHED,
      `${createdOn} 12:00`,
    );
    await manager.save(
      new VolunteerAuditLog({
        volunteerId: v.linked.id,
        type: "opportunity_status_changed",
        detail: `Linked to opportunity "${o.linked.title}" as opp-matched.`,
        occurredAt: m.linked.createdAt,
      }),
    );
  });

  afterAll(async () => {
    await queryRunner?.rollbackTransaction();
    await queryRunner?.release();
  });

  it("takes the cutoff from the lowest-id entry", async () => {
    const first = await manager.findOneOrFail(VolunteerAuditLog, {
      where: { type: "opportunity_status_changed" },
      order: { id: "ASC" },
    });
    expect(await findCutoff(manager)).toEqual(first.occurredAt);
    expect(m.fresh.createdAt.getTime()).toBeLessThan(
      first.occurredAt.getTime(),
    );
  });

  it("dry run plans own matches and writes nothing", async () => {
    const report = await backfill(manager, {
      apply: false,
      importedOn: [createdOn],
    });

    expect(report.cutoffFrom).toBe("first logged match step");
    expect(report.matchesCreatedOn[createdOn]).toBeGreaterThanOrEqual(4);
    expect(
      ownPlanned(report.planned).map(({ volunteerId, detail, occurredAt }) => ({
        volunteerId,
        detail,
        occurredAt,
      })),
    ).toEqual([
      {
        volunteerId: v.fresh.id,
        detail: `Linked to opportunity "${o.fresh.title}" as opp-matched (imported).`,
        occurredAt: m.fresh.createdAt,
      },
      {
        volunteerId: v.changed.id,
        detail: `Linked to opportunity "${o.changed.title}" (imported).`,
        occurredAt: m.changed.createdAt,
      },
      {
        volunteerId: v.changed.id,
        detail: `Opportunity "${o.changed.title}" status changed to opp-active.`,
        occurredAt: m.changed.updatedAt,
      },
      {
        volunteerId: v.twin.id,
        detail: `Linked to opportunity "${o.twin.title}" as opp-matched (imported).`,
        occurredAt: m.twin.createdAt,
      },
    ]);
    expect(await entriesOf(v.fresh)).toEqual([]);
    expect(await entriesOf(v.changed)).toEqual([]);
  });

  it("uses --cutoff instead of the first logged step when given", async () => {
    const cutoff = new Date("2020-01-01T00:00:00Z");
    const report = await backfill(manager, {
      apply: false,
      importedOn: [],
      cutoff,
    });

    expect(report.cutoff).toEqual(cutoff);
    expect(report.cutoffFrom).toBe("--cutoff");
    expect(ownPlanned(report.planned)).toEqual([]);
  });

  it("apply writes the planned entries, then a second run adds nothing", async () => {
    const first = await backfill(manager, { apply: true, importedOn: [] });

    const written = async () =>
      Object.fromEntries(
        await Promise.all(
          Object.entries(v).map(async ([key, volunteer]) => [
            key,
            (await entriesOf(volunteer)).map(
              ({ detail, occurredAt, actorUserId }) => ({
                detail,
                occurredAt,
                actorUserId,
              }),
            ),
          ]),
        ),
      );
    const afterFirst = await written();
    expect(afterFirst).toEqual({
      fresh: [
        {
          detail: `Linked to opportunity "${o.fresh.title}" as opp-matched.`,
          occurredAt: m.fresh.createdAt,
          actorUserId: null,
        },
      ],
      changed: [
        {
          detail: `Linked to opportunity "${o.changed.title}".`,
          occurredAt: m.changed.createdAt,
          actorUserId: null,
        },
        {
          detail: `Opportunity "${o.changed.title}" status changed to opp-active.`,
          occurredAt: m.changed.updatedAt,
          actorUserId: null,
        },
      ],
      twin: [
        {
          detail: `Linked to opportunity "${o.twin.title}" as opp-matched.`,
          occurredAt: m.twin.createdAt,
          actorUserId: null,
        },
        expect.objectContaining({
          detail: `Linked to opportunity "${o.twin.title}" as opp-pending.`,
        }),
      ],
      linked: [
        {
          detail: `Linked to opportunity "${o.linked.title}" as opp-matched.`,
          occurredAt: m.linked.createdAt,
          actorUserId: null,
        },
      ],
    });

    const second = await backfill(manager, { apply: true, importedOn: [] });
    expect(second.cutoff).toEqual(first.cutoff);
    expect(ownPlanned(second.planned)).toEqual([]);
    expect(second.skippedAlreadyLinked).toBeGreaterThanOrEqual(4);
    expect(await written()).toEqual(afterFirst);
  });

  it("leaves matches created within seconds before the cutoff alone", async () => {
    const cutoff = await findCutoff(manager);
    const lateVolunteer = await createVolunteer(manager);
    const lateOpportunity = await createOpportunity(
      manager,
      `Backfill late ${suffix}`,
    );
    await manager.query(
      `INSERT INTO opportunity_volunteer (volunteer_id, opportunity_id, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $4)`,
      [
        lateVolunteer.id,
        lateOpportunity.id,
        MATCHED,
        new Date(cutoff.getTime() - 3_000),
      ],
    );

    const report = await backfill(manager, { apply: false, importedOn: [] });
    expect(
      report.planned.filter(
        ({ volunteerId }) => volunteerId === lateVolunteer.id,
      ),
    ).toEqual([]);
  });
});
