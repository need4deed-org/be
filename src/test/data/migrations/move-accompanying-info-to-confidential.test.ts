import { OpportunityType } from "need4deed-sdk";
import { QueryRunner } from "typeorm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { dataSource } from "../../../data/data-source";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import { MoveAccompanyingInfoToConfidential1790889552388 } from "../../../data/migrations/1790889552388-move-accompanying-info-to-confidential";
import { randomNumericSuffix } from "../../random";

type Row = { info: string | null; infoConfidential: string | null };

// be#1092. The migration updates every accompanying row, and other test files
// share this database, so it runs inside a transaction that is rolled back.
describe("MoveAccompanyingInfoToConfidential migration", () => {
  const suffix = randomNumericSuffix();
  let queryRunner: QueryRunner;
  const ids: Record<string, number> = {};
  const after: Record<string, Row> = {};
  let warn: ReturnType<typeof vi.spyOn>;

  const fixtures: Record<string, Row & { type: OpportunityType }> = {
    onlyInfo: {
      type: OpportunityType.ACCOMPANYING,
      info: "Appointment text",
      infoConfidential: null,
    },
    onlyInfoBlankConfidential: {
      type: OpportunityType.ACCOMPANYING,
      info: "Appointment text",
      infoConfidential: "  ",
    },
    same: {
      type: OpportunityType.ACCOMPANYING,
      info: "Same text ",
      infoConfidential: "Same text",
    },
    blankInfo: {
      type: OpportunityType.ACCOMPANYING,
      info: " ",
      infoConfidential: "Confidential text",
    },
    differing: {
      type: OpportunityType.ACCOMPANYING,
      info: "Public text",
      infoConfidential: "Confidential text",
    },
    regular: {
      type: OpportunityType.REGULAR,
      info: "Regular text",
      infoConfidential: null,
    },
  };

  beforeAll(async () => {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    for (const [key, fixture] of Object.entries(fixtures)) {
      const saved = await queryRunner.manager.save(
        new Opportunity({ title: `Migration ${key} ${suffix}`, ...fixture }),
      );
      ids[key] = saved.id;
    }

    await new MoveAccompanyingInfoToConfidential1790889552388().up(queryRunner);

    for (const [key, id] of Object.entries(ids)) {
      const row = await queryRunner.manager.findOneOrFail(Opportunity, {
        where: { id },
      });
      after[key] = { info: row.info, infoConfidential: row.infoConfidential };
    }
  });

  afterAll(async () => {
    await queryRunner.rollbackTransaction();
    await queryRunner.release();
    warn.mockRestore();
  });

  it("moves info into an empty info_confidential", () => {
    expect(after.onlyInfo).toEqual({
      info: null,
      infoConfidential: "Appointment text",
    });
    expect(after.onlyInfoBlankConfidential).toEqual({
      info: null,
      infoConfidential: "Appointment text",
    });
  });

  it("clears info that is blank or duplicates info_confidential", () => {
    expect(after.same).toEqual({ info: null, infoConfidential: "Same text" });
    expect(after.blankInfo).toEqual({
      info: null,
      infoConfidential: "Confidential text",
    });
  });

  it("leaves differing rows alone and logs only their ids", () => {
    expect(after.differing).toEqual({
      info: "Public text",
      infoConfidential: "Confidential text",
    });
    const [, loggedIds] = warn.mock.calls[0];
    expect(loggedIds).toContain(ids.differing);
    expect(JSON.stringify(warn.mock.calls)).not.toContain("Public text");
  });

  it("does not touch other opportunity types", () => {
    expect(after.regular).toEqual({
      info: "Regular text",
      infoConfidential: null,
    });
  });
});
