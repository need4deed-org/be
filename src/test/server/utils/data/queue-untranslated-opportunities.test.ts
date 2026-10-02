import {
  EntityTableName,
  Lang,
  OpportunityStatusType,
  OpportunityType,
} from "need4deed-sdk";
import { QueryRunner } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { dataSource } from "../../../../data/data-source";
import FieldTranslation from "../../../../data/entity/field_translation.entity";
import Opportunity from "../../../../data/entity/opportunity/opportunity.entity";
import Language from "../../../../data/entity/profile/language.entity";
import { queueUntranslatedOpportunities } from "../../../../server/utils/data/translate-opportunities";
import { enqueue } from "../../../../services/translation/queue";
import { randomNumericSuffix } from "../../../random";

// No limit worth the name: every untranslated opportunity in the database.
const ALL = 1_000_000;

// be#1068 backfill. It queues every untranslated opportunity in the shared
// database, so it runs inside a transaction that is rolled back.
describe("queueUntranslatedOpportunities", () => {
  const suffix = randomNumericSuffix();
  let queryRunner: QueryRunner;
  const ids = {} as Record<Lang, number>;
  const opportunity: Record<string, Opportunity> = {};
  let firstRun: number;
  let secondRun: number;

  const fieldsOf = async (id: number) =>
    (
      await queryRunner.manager.find(FieldTranslation, {
        where: { opportunityId: id },
        order: { fieldName: "ASC" },
      })
    ).map((row) => [row.fieldName, row.languageId]);

  beforeAll(async () => {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
    for (const lang of Object.values(Lang)) {
      ids[lang] = (
        await dataSource.manager.findOneByOrFail(Language, { isoCode: lang })
      ).id;
    }
    queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    const save = (key: string, fields: Partial<Opportunity>) =>
      queryRunner.manager
        .save(
          new Opportunity({
            title: `Backfill ${key} ${suffix}`,
            type: OpportunityType.REGULAR,
            ...fields,
          }),
        )
        .then((saved) => (opportunity[key] = saved));

    await save("regular", { info: "Wir suchen Freiwillige" });
    await save("english", {
      info: "We are looking for volunteers",
      originalLanguageId: ids[Lang.EN],
    });
    await save("accompanying", {
      type: OpportunityType.ACCOMPANYING,
      info: "Appointment text",
    });
    await save("nothing", { title: " ", type: OpportunityType.ACCOMPANYING });
    await save("queued", { info: "Already queued" });
    await enqueue(
      queryRunner.manager,
      EntityTableName.OPPORTUNITY,
      opportunity.queued,
      { title: opportunity.queued.title },
    );

    firstRun = await queueUntranslatedOpportunities(queryRunner.manager, ALL);
    secondRun = await queueUntranslatedOpportunities(queryRunner.manager, ALL);
  });

  afterAll(async () => {
    await queryRunner.rollbackTransaction();
    await queryRunner.release();
  });

  it("queues title and info into the other language", async () => {
    expect(await fieldsOf(opportunity.regular.id)).toEqual([
      ["info", ids[Lang.EN]],
      ["title", ids[Lang.EN]],
    ]);
    expect(await fieldsOf(opportunity.english.id)).toEqual([
      ["info", ids[Lang.DE]],
      ["title", ids[Lang.DE]],
    ]);
  });

  it("never queues an accompanying opportunity's info", async () => {
    expect(await fieldsOf(opportunity.accompanying.id)).toEqual([
      ["title", ids[Lang.EN]],
    ]);
  });

  it("leaves an opportunity that already has translation rows alone", async () => {
    expect(await fieldsOf(opportunity.queued.id)).toEqual([
      ["title", ids[Lang.EN]],
    ]);
  });

  it("picks nothing again, including opportunities with nothing to translate", async () => {
    expect(firstRun).toBeGreaterThanOrEqual(3);
    expect(await fieldsOf(opportunity.nothing.id)).toEqual([]);
    expect(secondRun).toBe(0);
  });

  it("queues searching opportunities first", async () => {
    const savepoint = `searching_${suffix}`;
    await queryRunner.query(`SAVEPOINT ${savepoint}`);
    // Every other untranslated opportunity in the database is queued
    // already (beforeAll), so these two are the only candidates.
    const inactive = await queryRunner.manager.save(
      new Opportunity({
        title: `Backfill inactive ${suffix}`,
        type: OpportunityType.REGULAR,
        status: OpportunityStatusType.INACTIVE,
      }),
    );
    const searching = await queryRunner.manager.save(
      new Opportunity({
        title: `Backfill searching ${suffix}`,
        type: OpportunityType.REGULAR,
        status: OpportunityStatusType.SEARCHING,
      }),
    );

    expect(await queueUntranslatedOpportunities(queryRunner.manager, 1)).toBe(
      1,
    );
    expect(await fieldsOf(searching.id)).toHaveLength(1);
    expect(await fieldsOf(inactive.id)).toEqual([]);
    await queryRunner.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
  });

  it("queues at most `limit` opportunities", async () => {
    const savepoint = `limit_${suffix}`;
    await queryRunner.query(`SAVEPOINT ${savepoint}`);
    await queryRunner.manager.delete(FieldTranslation, {
      opportunityId: opportunity.regular.id,
    });
    await queryRunner.manager.delete(FieldTranslation, {
      opportunityId: opportunity.english.id,
    });

    expect(await queueUntranslatedOpportunities(queryRunner.manager, 1)).toBe(
      1,
    );
    await queryRunner.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
  });
});
