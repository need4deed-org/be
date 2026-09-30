import {
  EntityTableName,
  Lang,
  OpportunityType,
  TranslationOrigin,
  TranslationStatus,
} from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { dataSource } from "../../../data/data-source";
import FieldTranslation from "../../../data/entity/field_translation.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Language from "../../../data/entity/profile/language.entity";
import {
  enqueue,
  setHuman,
  setOriginalLanguage,
  sourceHashOf,
} from "../../../services/translation/queue";
import { randomNumericSuffix } from "../../random";

const OPP = EntityTableName.OPPORTUNITY;

describe("translation queue", () => {
  const suffix = randomNumericSuffix();
  const created: number[] = [];
  const ids = {} as Record<Lang, number>;

  const manager = () => dataSource.manager;

  async function newOpportunity(
    fields: Partial<Opportunity> = {},
  ): Promise<Opportunity> {
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
    return opportunity;
  }

  const rows = (opportunityId: number) =>
    manager().find(FieldTranslation, {
      where: { opportunityId },
      relations: ["language"],
      order: { fieldName: "ASC" },
    });

  const summary = async (opportunityId: number) =>
    (await rows(opportunityId)).map((row) => ({
      field: row.fieldName,
      lang: row.language.isoCode,
      origin: row.origin,
      status: row.status,
    }));

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
    // Translations cascade with their opportunity.
    if (created.length) {
      await manager().delete(Opportunity, created);
    }
  });

  describe("enqueue", () => {
    it("queues every field into every language but the original", async () => {
      const opportunity = await newOpportunity();

      await enqueue(manager(), OPP, opportunity, {
        title: opportunity.title,
        info: opportunity.info,
      });

      expect(await summary(opportunity.id)).toEqual([
        { field: "info", lang: "en", origin: "machine", status: "pending" },
        { field: "title", lang: "en", origin: "machine", status: "pending" },
      ]);
      const [info] = await rows(opportunity.id);
      expect(info.sourceHash).toBe(sourceHashOf("Wir suchen Freiwillige"));
      expect(info.translation).toBeNull();
    });

    it("targets German for an English original, and treats NULL as German", async () => {
      const english = await newOpportunity({
        originalLanguageId: ids[Lang.EN],
      });
      await enqueue(manager(), OPP, english, { title: english.title });
      expect(await summary(english.id)).toMatchObject([{ lang: "de" }]);

      const legacy = await newOpportunity({ originalLanguageId: undefined });
      await enqueue(manager(), OPP, legacy, { title: legacy.title });
      expect(await summary(legacy.id)).toMatchObject([{ lang: "en" }]);
    });

    it("leaves unchanged text alone, whatever its state", async () => {
      const opportunity = await newOpportunity();
      await enqueue(manager(), OPP, opportunity, { title: opportunity.title });
      const [row] = await rows(opportunity.id);
      await manager().update(FieldTranslation, row.id, {
        status: TranslationStatus.DONE,
        translation: "Childcare",
      });

      await enqueue(manager(), OPP, opportunity, { title: opportunity.title });

      expect(await rows(opportunity.id)).toMatchObject([
        { id: row.id, status: "done", translation: "Childcare" },
      ]);
    });

    it("resets changed text to a pending machine translation, human rows too", async () => {
      const opportunity = await newOpportunity();
      await setHuman(
        manager(),
        OPP,
        opportunity.id,
        "info",
        Lang.EN,
        "We need volunteers",
      );
      expect(await summary(opportunity.id)).toMatchObject([
        { origin: "human", status: "done" },
      ]);

      // Unchanged source: the human translation stays.
      await enqueue(manager(), OPP, opportunity, { info: opportunity.info });
      expect(await summary(opportunity.id)).toMatchObject([
        { origin: "human" },
      ]);

      // Edited source: re-translated by machine.
      await enqueue(manager(), OPP, opportunity, {
        info: "Wir suchen Freiwillige am Montag",
      });
      const [row] = await rows(opportunity.id);
      expect(row).toMatchObject({
        origin: TranslationOrigin.MACHINE,
        status: TranslationStatus.PENDING,
        translation: null,
        sourceHash: sourceHashOf("Wir suchen Freiwillige am Montag"),
      });
    });

    it("removes the translations of a field that was emptied", async () => {
      const opportunity = await newOpportunity();
      await enqueue(manager(), OPP, opportunity, {
        title: opportunity.title,
        info: opportunity.info,
      });

      await enqueue(manager(), OPP, opportunity, { info: "  " });

      expect(await summary(opportunity.id)).toMatchObject([{ field: "title" }]);
    });

    it("never writes a row that looks like reference data", async () => {
      const opportunity = await newOpportunity();
      await enqueue(manager(), OPP, opportunity, {
        title: opportunity.title,
        info: opportunity.info,
      });
      await setHuman(
        manager(),
        OPP,
        opportunity.id,
        "title",
        Lang.EN,
        "Childcare",
      );

      const origins = (await rows(opportunity.id)).map(({ origin }) => origin);
      expect(origins).not.toContain(TranslationOrigin.REFERENCE);
      expect(origins.length).toBe(2);
    });

    it("runs in the caller's transaction", async () => {
      const opportunity = await newOpportunity();

      await expect(
        dataSource.transaction(async (transaction) => {
          await enqueue(transaction, OPP, opportunity, {
            title: opportunity.title,
          });
          throw new Error("the edit failed");
        }),
      ).rejects.toThrow("the edit failed");

      expect(await rows(opportunity.id)).toEqual([]);
    });

    it("rejects tables and fields outside the allowlist", async () => {
      const opportunity = await newOpportunity();
      await expect(
        enqueue(manager(), OPP, opportunity, { infoConfidential: "secret" }),
      ).rejects.toThrow(/not machine-translated: infoConfidential/);
      await expect(
        enqueue(manager(), EntityTableName.SKILL, { id: 1 }, { title: "x" }),
      ).rejects.toThrow(/skill is not machine-translated/);
      expect(await rows(opportunity.id)).toEqual([]);
    });
  });

  describe("setHuman", () => {
    it("stores the translation against the current source text", async () => {
      const opportunity = await newOpportunity();

      await setHuman(
        manager(),
        OPP,
        opportunity.id,
        "title",
        Lang.EN,
        " Childcare ",
      );

      expect(await rows(opportunity.id)).toMatchObject([
        {
          origin: TranslationOrigin.HUMAN,
          status: TranslationStatus.DONE,
          translation: "Childcare",
          sourceHash: sourceHashOf(opportunity.title),
        },
      ]);
    });

    it("refuses the original language", async () => {
      const opportunity = await newOpportunity();
      await expect(
        setHuman(manager(), OPP, opportunity.id, "title", Lang.DE, "x"),
      ).rejects.toThrow(/original language/);
    });
  });

  describe("setOriginalLanguage", () => {
    it("switches the target languages", async () => {
      const opportunity = await newOpportunity();
      await enqueue(manager(), OPP, opportunity, {
        title: opportunity.title,
        info: opportunity.info,
      });

      await setOriginalLanguage(manager(), OPP, opportunity.id, Lang.EN);

      const updated = await manager().findOneByOrFail(Opportunity, {
        id: opportunity.id,
      });
      expect(updated.originalLanguageId).toBe(ids[Lang.EN]);
      expect(await summary(opportunity.id)).toEqual([
        { field: "info", lang: "de", origin: "machine", status: "pending" },
        { field: "title", lang: "de", origin: "machine", status: "pending" },
      ]);
    });

    it("does nothing when the language is already the original", async () => {
      const opportunity = await newOpportunity();
      await enqueue(manager(), OPP, opportunity, { title: opportunity.title });
      const before = await rows(opportunity.id);

      await setOriginalLanguage(manager(), OPP, opportunity.id, Lang.DE);

      expect(await rows(opportunity.id)).toEqual(before);
    });
  });
});
