import { Lang, OpportunityType } from "need4deed-sdk";
import { QueryRunner } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { dataSource } from "../../../data/data-source";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Language from "../../../data/entity/profile/language.entity";
import { DefaultOpportunityOriginalLanguage1790930410611 } from "../../../data/migrations/1790930410611-default-opportunity-original-language";
import { randomNumericSuffix } from "../../random";

// be#1068. The migration updates every opportunity, and other test files
// share this database, so it runs inside a transaction that is rolled back.
describe("DefaultOpportunityOriginalLanguage migration", () => {
  const suffix = randomNumericSuffix();
  let queryRunner: QueryRunner;
  const ids = {} as Record<Lang, number>;
  let unset: Opportunity;
  let english: Opportunity;

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
    unset = await queryRunner.manager.save(
      new Opportunity({
        title: `Unset ${suffix}`,
        type: OpportunityType.REGULAR,
      }),
    );
    english = await queryRunner.manager.save(
      new Opportunity({
        title: `English ${suffix}`,
        type: OpportunityType.REGULAR,
        originalLanguageId: ids[Lang.EN],
      }),
    );

    await new DefaultOpportunityOriginalLanguage1790930410611().up(queryRunner);
  });

  afterAll(async () => {
    await queryRunner.rollbackTransaction();
    await queryRunner.release();
  });

  const languageOf = async (id: number) =>
    (await queryRunner.manager.findOneByOrFail(Opportunity, { id }))
      .originalLanguageId;

  it("sets German where the original language is unset", async () => {
    expect(await languageOf(unset.id)).toBe(ids[Lang.DE]);
  });

  it("keeps an original language that is set", async () => {
    expect(await languageOf(english.id)).toBe(ids[Lang.EN]);
  });
});
