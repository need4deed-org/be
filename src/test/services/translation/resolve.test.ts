import {
  EntityTableName,
  Lang,
  OpportunityType,
  TranslationStatus,
} from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { dataSource } from "../../../data/data-source";
import FieldTranslation from "../../../data/entity/field_translation.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Language from "../../../data/entity/profile/language.entity";
import { enqueue, setHuman } from "../../../services/translation/queue";
import { resolve } from "../../../services/translation/resolve";
import { randomNumericSuffix } from "../../random";

const OPP = EntityTableName.OPPORTUNITY;
const FIELDS = ["title", "info"];

describe("resolve", () => {
  const suffix = randomNumericSuffix();
  const created: number[] = [];
  const ids = {} as Record<Lang, number>;
  const manager = () => dataSource.manager;

  // An opportunity with its fields queued; `translate` marks them done.
  async function opportunityWith(
    original: Lang,
    translate: Partial<Record<"title" | "info", string>> = {},
  ): Promise<Opportunity> {
    const opportunity = await manager().save(
      new Opportunity({
        title: `Kinderbetreuung ${suffix}-${created.length}`,
        info: "Wir suchen Freiwillige",
        type: OpportunityType.REGULAR,
        originalLanguageId: ids[original],
      }),
    );
    created.push(opportunity.id);
    await enqueue(manager(), OPP, opportunity, {
      title: opportunity.title,
      info: opportunity.info,
    });
    for (const [fieldName, translation] of Object.entries(translate)) {
      await manager().update(
        FieldTranslation,
        { opportunityId: opportunity.id, fieldName },
        { status: TranslationStatus.DONE, translation },
      );
    }
    return opportunity;
  }

  const fresh = (id: number) => manager().findOneByOrFail(Opportunity, { id });

  beforeAll(async () => {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
    for (const lang of Object.values(Lang)) {
      ids[lang] = (
        await manager().findOneByOrFail(Language, { isoCode: lang })
      ).id;
    }
  });

  afterAll(async () => {
    if (created.length) {
      await manager().delete(Opportunity, created);
    }
  });

  it("shows done translations in the requested language, in place", async () => {
    const opportunity = await opportunityWith(Lang.DE, {
      title: "Childcare",
      info: "We are looking for volunteers",
    });
    const loaded = await fresh(opportunity.id);

    const result = await resolve(manager(), OPP, [loaded], FIELDS, Lang.EN);

    expect(result[0]).toBe(loaded);
    expect(loaded).toMatchObject({
      title: "Childcare",
      info: "We are looking for volunteers",
    });
  });

  it("keeps the original in the original language", async () => {
    const opportunity = await opportunityWith(Lang.DE, { title: "Childcare" });
    const loaded = await fresh(opportunity.id);

    await resolve(manager(), OPP, [loaded], FIELDS, Lang.DE);

    expect(loaded.title).toBe(opportunity.title);
  });

  it("falls back to the original while pending or failed", async () => {
    const opportunity = await opportunityWith(Lang.DE, { title: "Childcare" });
    await manager().update(
      FieldTranslation,
      { opportunityId: opportunity.id, fieldName: "info" },
      { status: TranslationStatus.FAILED, lastErrorCode: "length_ratio" },
    );
    const loaded = await fresh(opportunity.id);

    await resolve(manager(), OPP, [loaded], FIELDS, Lang.EN);

    expect(loaded.title).toBe("Childcare");
    expect(loaded.info).toBe("Wir suchen Freiwillige");
  });

  it("serves human translations", async () => {
    const opportunity = await opportunityWith(Lang.DE);
    await setHuman(
      manager(),
      OPP,
      opportunity.id,
      "title",
      Lang.EN,
      "Help with childcare",
    );
    const loaded = await fresh(opportunity.id);

    await resolve(manager(), OPP, [loaded], FIELDS, Lang.EN);

    expect(loaded.title).toBe("Help with childcare");
  });

  it("translates an English original into German", async () => {
    const opportunity = await opportunityWith(Lang.EN, {
      title: "Kinderbetreuung DE",
    });
    const english = await fresh(opportunity.id);
    const german = await fresh(opportunity.id);

    await resolve(manager(), OPP, [english], FIELDS, Lang.EN);
    await resolve(manager(), OPP, [german], FIELDS, Lang.DE);

    expect(english.title).toBe(opportunity.title);
    expect(german.title).toBe("Kinderbetreuung DE");
  });

  it("ignores a translation of an older version of the text", async () => {
    const opportunity = await opportunityWith(Lang.DE, { title: "Childcare" });
    // Text changed without enqueue: the done row is outdated.
    await manager().update(Opportunity, opportunity.id, {
      title: `${opportunity.title} neu`,
    });
    const loaded = await fresh(opportunity.id);

    await resolve(manager(), OPP, [loaded], FIELDS, Lang.EN);

    expect(loaded.title).toBe(`${opportunity.title} neu`);
  });

  it("loads the translations of many entities in one query", async () => {
    const opportunities = await Promise.all([
      opportunityWith(Lang.DE, { title: "One" }),
      opportunityWith(Lang.DE, { title: "Two" }),
      opportunityWith(Lang.DE, { title: "Three" }),
    ]);
    const loaded = await Promise.all(opportunities.map(({ id }) => fresh(id)));
    const find = vi.spyOn(manager(), "find");

    await resolve(manager(), OPP, loaded, FIELDS, Lang.EN);

    const translationQueries = find.mock.calls.filter(
      ([target]) => target === FieldTranslation,
    );
    find.mockRestore();
    expect(translationQueries).toHaveLength(1);
    expect(loaded.map(({ title }) => title)).toEqual(["One", "Two", "Three"]);
  });

  it("rejects fields outside the allowlist", async () => {
    await expect(
      resolve(manager(), OPP, [], ["infoConfidential"], Lang.EN),
    ).rejects.toThrow(/not machine-translated/);
  });
});
