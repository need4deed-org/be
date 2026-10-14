import {
  EntityTableName,
  Lang,
  OpportunityType,
  TranslationOrigin,
  TranslationStatus,
} from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { BadRequestError } from "../../../config";
import { dataSource } from "../../../data/data-source";
import FieldTranslation from "../../../data/entity/field_translation.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Language from "../../../data/entity/profile/language.entity";
import { enqueue } from "../../../services/translation/queue";
import { writeHumanTranslations } from "../../../services/translation/write";
import { randomNumericSuffix } from "../../random";

const OPP = EntityTableName.OPPORTUNITY;

describe("translation writes", () => {
  const suffix = randomNumericSuffix();
  const created: number[] = [];
  const ids = {} as Record<Lang, number>;

  const manager = () => dataSource.manager;

  async function queued(fields: Partial<Opportunity> = {}) {
    const opportunity = await manager().save(
      new Opportunity({
        title: `Kinderbetreuung ${suffix}-${created.length}`,
        info: "Wir suchen Freiwillige",
        type: OpportunityType.REGULAR,
        originalLanguageId: ids[Lang.DE],
        ...fields,
      }),
    );
    created.push(opportunity.id);
    await enqueue(manager(), OPP, opportunity, {
      title: opportunity.title,
      info: opportunity.info,
    });
    return opportunity;
  }

  const rows = (opportunityId: number) =>
    manager().find(FieldTranslation, {
      where: { opportunityId },
      order: { fieldName: "ASC" },
    });

  async function translated(opportunity: Opportunity) {
    await manager().update(
      FieldTranslation,
      { opportunityId: opportunity.id, fieldName: "title" },
      { status: TranslationStatus.DONE, translation: "Childcare" },
    );
  }

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

  describe("writeHumanTranslations", () => {
    it.each([
      [Lang.DE, Lang.DE, false],
      [Lang.DE, Lang.EN, true],
      [Lang.EN, Lang.EN, false],
      [Lang.EN, Lang.DE, true],
    ])(
      "original %s, written in %s: handled %s",
      async (original, lang, handled) => {
        const opportunity = await queued({ originalLanguageId: ids[original] });
        expect(
          await writeHumanTranslations(manager(), OPP, opportunity, lang, {}),
        ).toBe(handled);
      },
    );

    it("treats a NULL original language as German", async () => {
      const legacy = await queued({ originalLanguageId: null });
      expect(
        await writeHumanTranslations(manager(), OPP, legacy, Lang.DE, {}),
      ).toBe(false);
      expect(
        await writeHumanTranslations(manager(), OPP, legacy, Lang.EN, {}),
      ).toBe(true);
    });

    it("stores a changed field as a human translation and keeps the source", async () => {
      const opportunity = await queued();
      await translated(opportunity);

      await writeHumanTranslations(manager(), OPP, opportunity, Lang.EN, {
        title: " Babysitting ",
      });

      const [info, title] = await rows(opportunity.id);
      expect(title).toMatchObject({
        origin: TranslationOrigin.HUMAN,
        status: TranslationStatus.DONE,
        translation: "Babysitting",
      });
      expect(info).toMatchObject({
        origin: TranslationOrigin.MACHINE,
        status: TranslationStatus.PENDING,
      });
      const source = await manager().findOneByOrFail(Opportunity, {
        id: opportunity.id,
      });
      expect(source.title).toBe(opportunity.title);
    });

    it("leaves fields alone that match what is served", async () => {
      const opportunity = await queued();
      await translated(opportunity);
      const before = await rows(opportunity.id);

      await writeHumanTranslations(manager(), OPP, opportunity, Lang.EN, {
        title: "Childcare",
        info: "Wir suchen Freiwillige",
      });

      expect(await rows(opportunity.id)).toEqual(before);
    });

    it("treats a value equal to the original as unchanged", async () => {
      const opportunity = await queued();
      await translated(opportunity);
      const before = await rows(opportunity.id);

      await writeHumanTranslations(manager(), OPP, opportunity, Lang.EN, {
        title: opportunity.title,
      });

      expect(await rows(opportunity.id)).toEqual(before);
    });

    it("skips fields that are not submitted", async () => {
      const opportunity = await queued();
      const before = await rows(opportunity.id);

      await writeHumanTranslations(manager(), OPP, opportunity, Lang.EN, {
        title: undefined,
      });

      expect(await rows(opportunity.id)).toEqual(before);
    });

    it("writes nothing when any field is refused", async () => {
      const opportunity = await queued();
      await translated(opportunity);
      const before = await rows(opportunity.id);

      await expect(
        writeHumanTranslations(manager(), OPP, opportunity, Lang.EN, {
          title: "Babysitting",
          info: "",
        }),
      ).rejects.toThrow(BadRequestError);

      expect(await rows(opportunity.id)).toEqual(before);
    });

    it("refuses a translation of a field with no original text", async () => {
      const opportunity = await queued({ info: null });

      await expect(
        writeHumanTranslations(manager(), OPP, opportunity, Lang.EN, {
          info: "We need help",
        }),
      ).rejects.toThrow(/no original text/);
      expect((await rows(opportunity.id)).map((row) => row.fieldName)).toEqual([
        "title",
      ]);
    });

    it("refuses to clear a field outside the original language", async () => {
      const opportunity = await queued();
      await translated(opportunity);

      await expect(
        writeHumanTranslations(manager(), OPP, opportunity, Lang.EN, {
          title: "",
        }),
      ).rejects.toThrow(BadRequestError);
    });
  });
});
