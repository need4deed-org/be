import { FastifyInstance } from "fastify";
import { Lang } from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { dataSource } from "../../../../data/data-source";
import Deal from "../../../../data/entity/deal.entity";
import Postcode from "../../../../data/entity/location/postcode.entity";
import DealLanguage from "../../../../data/entity/m2m/deal-language";
import DealSkill from "../../../../data/entity/m2m/deal-skill";
import Volunteer from "../../../../data/entity/volunteer/volunteer.entity";
import { DealType } from "../../../../data/types/enums";
import { createServer } from "../../../../server";
import { addTranslatedFields } from "../../../../server/utils/data/for-routes";

// Deliberately reuses existing, already-seeded reference rows (language,
// skill, field_translation) rather than inserting new ones — those tables
// are reference data, not something a test should be writing into, even
// temporarily. Only the transactional rows (postcode/deal/volunteer/
// dealLanguage/dealSkill) linking to them are created and cleaned up here.
describe("addTranslatedFields", () => {
  let fastify: FastifyInstance;
  let postcode: Postcode;
  let deal: Deal;
  let volunteer: Volunteer;
  let dealLanguage: DealLanguage;
  let dealSkill: DealSkill;

  // German itself (id 1540) — has a real German field_translation ("Deutsch").
  const languageWithGermanTranslation = 1540;
  // "Ghotuo" (id 1) — a real, seeded language with no English translation.
  const languageWithNoEnglishTranslation = 1;
  // "Woodworking" (id 1) — has a real German field_translation ("Holzverarbeitung").
  const skillWithGermanTranslation = 1;

  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const postcodeRepository = dataSource.getRepository(Postcode);
    const dealRepository = dataSource.getRepository(Deal);
    const volunteerRepository = dataSource.getRepository(Volunteer);
    const dealLanguageRepository = dataSource.getRepository(DealLanguage);
    const dealSkillRepository = dataSource.getRepository(DealSkill);

    postcode = await postcodeRepository.save(
      new Postcode({ value: `1${suffix.slice(-4)}` }),
    );
    deal = await dealRepository.save(
      new Deal({ type: DealType.VOLUNTEER, postcodeId: postcode.id }),
    );
    volunteer = await volunteerRepository.save(
      new Volunteer({ dealId: deal.id }),
    );

    dealLanguage = await dealLanguageRepository.save(
      new DealLanguage({
        dealId: deal.id,
        languageId: languageWithGermanTranslation,
      }),
    );
    dealSkill = await dealSkillRepository.save(
      new DealSkill({ dealId: deal.id, skillId: skillWithGermanTranslation }),
    );
  });

  afterAll(async () => {
    const dealLanguageRepository = dataSource.getRepository(DealLanguage);
    const dealSkillRepository = dataSource.getRepository(DealSkill);
    const volunteerRepository = dataSource.getRepository(Volunteer);
    const dealRepository = dataSource.getRepository(Deal);
    const postcodeRepository = dataSource.getRepository(Postcode);

    await dealLanguageRepository.delete({ id: dealLanguage.id });
    await dealSkillRepository.delete({ id: dealSkill.id });
    await volunteerRepository.delete({ id: volunteer.id });
    await dealRepository.delete({ id: deal.id });
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

  it("populates .translation on dealLanguage/dealSkill entities from the real field_translation data", async () => {
    const v = await loadVolunteerWithRelations();

    await addTranslatedFields([v], Lang.DE);

    expect(v.deal.dealLanguage[0].language.translation).toBe("Deutsch");
    expect(v.deal.dealSkill[0].skill.translation).toBe("Holzverarbeitung");
  });

  it("leaves .translation unset when no field_translation row exists for the requested language, falling back to the original field value downstream", async () => {
    const dealLanguageRepository = dataSource.getRepository(DealLanguage);
    await dealLanguageRepository.update(
      { id: dealLanguage.id },
      { languageId: languageWithNoEnglishTranslation },
    );
    const v = await loadVolunteerWithRelations();

    await addTranslatedFields([v], Lang.EN);

    // getOptionItems/getLanguages then fall back to language.title itself.
    expect(v.deal.dealLanguage[0].language.translation).toBeUndefined();
    expect(v.deal.dealLanguage[0].language.title).toBe("Ghotuo");

    await dealLanguageRepository.update(
      { id: dealLanguage.id },
      { languageId: languageWithGermanTranslation },
    );
  });

  it("does not throw when dealActivity isn't loaded (be#849 hardening)", async () => {
    // Mirrors the actual notify-route call site: only dealLanguage/dealSkill
    // are eager-loaded there, never dealActivity.
    const v = await loadVolunteerWithRelations();
    expect(v.deal.dealActivity).toBeUndefined();

    await expect(addTranslatedFields([v], Lang.DE)).resolves.toBeUndefined();
  });
});
