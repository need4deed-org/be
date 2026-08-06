import { FastifyInstance } from "fastify";
import { EntityTableName, Lang } from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { dataSource } from "../../../../data/data-source";
import Deal from "../../../../data/entity/deal.entity";
import FieldTranslation from "../../../../data/entity/field_translation.entity";
import Postcode from "../../../../data/entity/location/postcode.entity";
import DealLanguage from "../../../../data/entity/m2m/deal-language";
import DealSkill from "../../../../data/entity/m2m/deal-skill";
import Language from "../../../../data/entity/profile/language.entity";
import Skill from "../../../../data/entity/profile/skill.entity";
import Volunteer from "../../../../data/entity/volunteer/volunteer.entity";
import { DealType } from "../../../../data/types/enums";
import { createServer } from "../../../../server";
import { addTranslatedFields } from "../../../../server/utils/data/for-routes";

describe("addTranslatedFields", () => {
  let fastify: FastifyInstance;
  let postcode: Postcode;
  let deal: Deal;
  let volunteer: Volunteer;
  let sourceLanguage: Language;
  let skill: Skill;
  let dealLanguage: DealLanguage;
  let dealSkill: DealSkill;
  let translations: FieldTranslation[];

  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const postcodeRepository = dataSource.getRepository(Postcode);
    const dealRepository = dataSource.getRepository(Deal);
    const volunteerRepository = dataSource.getRepository(Volunteer);
    const languageRepository = dataSource.getRepository(Language);
    const skillRepository = dataSource.getRepository(Skill);
    const dealLanguageRepository = dataSource.getRepository(DealLanguage);
    const dealSkillRepository = dataSource.getRepository(DealSkill);
    const fieldTranslationRepository =
      dataSource.getRepository(FieldTranslation);

    // The real, already-seeded German locale row — addTranslatedFields()
    // resolves its `isoCode` argument to this exact row internally.
    const germanLanguage = await languageRepository.findOneByOrFail({
      isoCode: "de",
    });

    postcode = await postcodeRepository.save(
      new Postcode({ value: `1${suffix.slice(-4)}` }),
    );
    deal = await dealRepository.save(
      new Deal({ type: DealType.VOLUNTEER, postcodeId: postcode.id }),
    );
    volunteer = await volunteerRepository.save(
      new Volunteer({ dealId: deal.id }),
    );

    sourceLanguage = await languageRepository.save(
      new Language({ isoCode: "xx", title: `Test Language ${suffix}` }),
    );
    skill = await skillRepository.save(
      new Skill({ title: `Test Skill ${suffix}` }),
    );

    dealLanguage = await dealLanguageRepository.save(
      new DealLanguage({ dealId: deal.id, languageId: sourceLanguage.id }),
    );
    dealSkill = await dealSkillRepository.save(
      new DealSkill({ dealId: deal.id, skillId: skill.id }),
    );

    translations = await fieldTranslationRepository.save([
      fieldTranslationRepository.create({
        language: germanLanguage,
        entityType: EntityTableName.LANGUAGE,
        entityId: sourceLanguage.id,
        translation: `Deutsche Übersetzung ${suffix}`,
      }),
      fieldTranslationRepository.create({
        language: germanLanguage,
        entityType: EntityTableName.SKILL,
        entityId: skill.id,
        translation: `Deutsche Fähigkeit ${suffix}`,
      }),
    ]);
  });

  afterAll(async () => {
    const fieldTranslationRepository =
      dataSource.getRepository(FieldTranslation);
    const dealLanguageRepository = dataSource.getRepository(DealLanguage);
    const dealSkillRepository = dataSource.getRepository(DealSkill);
    const volunteerRepository = dataSource.getRepository(Volunteer);
    const dealRepository = dataSource.getRepository(Deal);
    const languageRepository = dataSource.getRepository(Language);
    const skillRepository = dataSource.getRepository(Skill);
    const postcodeRepository = dataSource.getRepository(Postcode);

    await fieldTranslationRepository.delete(translations.map((t) => t.id));
    await dealLanguageRepository.delete({ id: dealLanguage.id });
    await dealSkillRepository.delete({ id: dealSkill.id });
    await volunteerRepository.delete({ id: volunteer.id });
    await dealRepository.delete({ id: deal.id });
    await languageRepository.delete({ id: sourceLanguage.id });
    await skillRepository.delete({ id: skill.id });
    await postcodeRepository.delete({ id: postcode.id });
    await fastify.close();
  });

  async function loadVolunteerWithRelations(): Promise<Volunteer> {
    const v = await dataSource.getRepository(Volunteer).findOne({
      where: { id: volunteer.id },
      relations: ["deal.dealLanguage.language", "deal.dealSkill.skill"],
    });
    if (!v) {
      throw new Error(`Volunteer ${volunteer.id} not found`);
    }
    return v;
  }

  it("populates .translation on dealLanguage/dealSkill entities from field_translation", async () => {
    const v = await loadVolunteerWithRelations();

    await addTranslatedFields([v], Lang.DE);

    expect(v.deal.dealLanguage[0].language.translation).toBe(
      `Deutsche Übersetzung ${suffix}`,
    );
    expect(v.deal.dealSkill[0].skill.translation).toBe(
      `Deutsche Fähigkeit ${suffix}`,
    );
  });

  it("leaves .translation unset when no field_translation row exists for the requested language", async () => {
    const v = await loadVolunteerWithRelations();

    // "en" is a real, seeded locale, but no field_translation row was
    // created above for that language — the entity's own .translation
    // (never populated for a fresh fetch) should stay untouched, letting the
    // caller (getOptionItems/getLanguages) fall back to the raw .title.
    await addTranslatedFields([v], Lang.EN);

    expect(v.deal.dealLanguage[0].language.translation).toBeUndefined();
    expect(v.deal.dealSkill[0].skill.translation).toBeUndefined();
  });

  it("does not throw when dealActivity isn't loaded (be#849 hardening)", async () => {
    // Mirrors the actual notify-route call site: only dealLanguage/dealSkill
    // are eager-loaded there, never dealActivity.
    const v = await loadVolunteerWithRelations();
    expect(v.deal.dealActivity).toBeUndefined();

    await expect(addTranslatedFields([v], Lang.DE)).resolves.toBeUndefined();
  });
});
