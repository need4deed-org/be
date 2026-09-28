import {
  EntityTableName,
  OpportunityType,
  TranslationOrigin,
  TranslationStatus,
} from "need4deed-sdk";
import { Repository } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { dataSource } from "../../../data/data-source";
import FieldTranslation from "../../../data/entity/field_translation.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Language from "../../../data/entity/profile/language.entity";
import Skill from "../../../data/entity/profile/skill.entity";
import { getInstanceByTranslation } from "../../../server/utils/data/for-routes";
import { translatedEntities } from "../../../services/translation/registry";
import { randomNumericSuffix } from "../../random";

// Schema guarantees of field_translation after be#1066: exactly one FK per
// row, one row per source row × field × target language, and translations
// deleted together with their source row.
describe("field_translation", () => {
  const suffix = randomNumericSuffix();
  let translationRepository: Repository<FieldTranslation>;
  let skillRepository: Repository<Skill>;
  let opportunityRepository: Repository<Opportunity>;
  let de: Language;
  let en: Language;
  let skill: Skill;
  let opportunity: Opportunity;

  beforeAll(async () => {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
    translationRepository = dataSource.getRepository(FieldTranslation);
    skillRepository = dataSource.getRepository(Skill);
    opportunityRepository = dataSource.getRepository(Opportunity);
    const languageRepository = dataSource.getRepository(Language);
    de = await languageRepository.findOneByOrFail({ isoCode: "de" });
    en = await languageRepository.findOneByOrFail({ isoCode: "en" });

    skill = await skillRepository.save(
      skillRepository.create({ title: `ft-test-skill-${suffix}` }),
    );
    opportunity = await opportunityRepository.save(
      new Opportunity({
        title: `ft-test-opportunity-${suffix}`,
        type: OpportunityType.REGULAR,
      }),
    );
  });

  afterAll(async () => {
    // Cascades remove every translation these tests created.
    await opportunityRepository.delete({ id: opportunity.id });
    await skillRepository.delete({ id: skill.id });
  });

  it("matches the registry: every registered FK is a column of the entity", () => {
    const columns = dataSource
      .getMetadata(FieldTranslation)
      .columns.map(({ propertyName }) => propertyName);
    for (const { fk } of Object.values(translatedEntities)) {
      expect(columns).toContain(fk);
    }
  });

  it("defaults a new row to a done reference translation", async () => {
    const row = await translationRepository.save(
      translationRepository.create({
        skillId: skill.id,
        languageId: de.id,
        translation: `Fähigkeit ${suffix}`,
      }),
    );
    const saved = await translationRepository.findOneByOrFail({ id: row.id });
    expect(saved.origin).toBe(TranslationOrigin.REFERENCE);
    expect(saved.status).toBe(TranslationStatus.DONE);
    expect(saved.attempts).toBe(0);
    expect(saved.updatedAt).toBeInstanceOf(Date);
  });

  it("rejects a row that points at nothing", async () => {
    await expect(
      translationRepository.insert({ languageId: de.id, translation: "x" }),
    ).rejects.toThrow(/CHK_field_translation_one_target/);
  });

  it("rejects a row that points at two tables", async () => {
    await expect(
      translationRepository.insert({
        skillId: skill.id,
        opportunityId: opportunity.id,
        languageId: de.id,
        translation: "x",
      }),
    ).rejects.toThrow(/CHK_field_translation_one_target/);
  });

  it("keeps one row per source row, field and target language", async () => {
    const row = {
      opportunityId: opportunity.id,
      fieldName: "title",
      languageId: en.id,
      translation: `opportunity ${suffix}`,
    };
    await translationRepository.insert(row);
    await expect(translationRepository.insert(row)).rejects.toThrow(
      /UQ_field_translation_opportunity/,
    );

    // Another field or another target language of the same row is fine.
    await translationRepository.insert({ ...row, fieldName: "info" });
    await translationRepository.insert({ ...row, languageId: de.id });
  });

  it("allows pending rows without text", async () => {
    const row = await translationRepository.save(
      translationRepository.create({
        opportunityId: opportunity.id,
        fieldName: "info",
        languageId: de.id,
        translation: null,
        origin: TranslationOrigin.MACHINE,
        status: TranslationStatus.PENDING,
      }),
    );
    expect(row.translation).toBeNull();
  });

  it("deletes translations together with their source row", async () => {
    const doomed = await skillRepository.save(
      skillRepository.create({ title: `ft-test-doomed-${suffix}` }),
    );
    await translationRepository.insert([
      { skillId: doomed.id, languageId: de.id, translation: "weg" },
      { skillId: doomed.id, languageId: en.id, translation: "gone" },
    ]);

    await skillRepository.delete({ id: doomed.id });

    expect(await translationRepository.countBy({ skillId: doomed.id })).toBe(0);
  });

  describe("getInstanceByTranslation", () => {
    it("resolves a reference translation to its row", async () => {
      const text = `Referenz ${suffix}`;
      await translationRepository.insert({
        skillId: skill.id,
        languageId: en.id,
        translation: text,
      });

      const found = await getInstanceByTranslation(
        text,
        Skill,
        EntityTableName.SKILL,
      );

      expect(found?.id).toBe(skill.id);
    });

    it("ignores machine and human translations", async () => {
      const other = await skillRepository.save(
        skillRepository.create({ title: `ft-test-other-${suffix}` }),
      );
      const text = `Maschine ${suffix}`;
      await translationRepository.insert({
        skillId: other.id,
        languageId: de.id,
        translation: text,
        origin: TranslationOrigin.MACHINE,
      });

      try {
        expect(
          await getInstanceByTranslation(text, Skill, EntityTableName.SKILL),
        ).toBeNull();
      } finally {
        await skillRepository.delete({ id: other.id });
      }
    });

    it("returns null for a table without translations", async () => {
      expect(
        await getInstanceByTranslation(
          `nothing ${suffix}`,
          Skill,
          EntityTableName.VOLUNTEER,
        ),
      ).toBeNull();
    });
  });
});
