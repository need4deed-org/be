import {
  EntityTableName,
  Lang,
  OpportunityType,
  TranslatedIntoType,
  TranslationStatus,
} from "need4deed-sdk";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { dataSource } from "../../../data/data-source";
import FieldTranslation from "../../../data/entity/field_translation.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Language from "../../../data/entity/profile/language.entity";
import { fetchJsonFromUrl } from "../../../data/utils";
import { sendEmailNewRegular } from "../../../services/notify/events/email-new-regular";
import { sendEmailSuggestion } from "../../../services/notify/events/email-suggestion";
import { sendEmailSuggestionAccompanying } from "../../../services/notify/events/email-suggestion-accompanying";
import {
  localizedOpportunityTitle,
  opportunityTitleIn,
} from "../../../services/notify/opportunity-title";
import type { EmailTransport } from "../../../services/notify/types";
import { enqueue } from "../../../services/translation/queue";
import { randomNumericSuffix } from "../../random";

vi.mock("../../../data/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../data/utils")>();
  return { ...actual, fetchJsonFromUrl: vi.fn() };
});

const send = vi.fn();
const email: EmailTransport = { send };

describe("opportunity title in emails", () => {
  const suffix = randomNumericSuffix();
  const created: number[] = [];
  const ids = {} as Record<Lang, number>;
  const manager = () => dataSource.manager;

  async function opportunityWith(
    original: Lang,
    translation?: { status: TranslationStatus; text?: string },
  ): Promise<Opportunity> {
    const opportunity = await manager().save(
      new Opportunity({
        title: `Kinderbetreuung ${suffix}-${created.length}`,
        type: OpportunityType.REGULAR,
        originalLanguageId: ids[original],
      }),
    );
    created.push(opportunity.id);
    await enqueue(manager(), EntityTableName.OPPORTUNITY, opportunity, {
      title: opportunity.title,
    });
    if (translation) {
      await manager().update(
        FieldTranslation,
        { opportunityId: opportunity.id, fieldName: "title" },
        { status: translation.status, translation: translation.text },
      );
    }
    return opportunity;
  }

  function ovWith(
    opportunity: Opportunity,
    over: Record<string, unknown> = {},
  ) {
    return {
      id: 1,
      volunteerId: 1,
      volunteer: {
        person: { name: "Vera Volunteer", email: "vera@example.com" },
      },
      opportunity: {
        id: opportunity.id,
        title: opportunity.title,
        originalLanguageId: opportunity.originalLanguageId,
        ...over,
      },
    } as unknown as Parameters<typeof sendEmailSuggestion>[1];
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

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchJsonFromUrl).mockRejectedValue(new Error("no CDN in tests"));
  });

  afterAll(async () => {
    if (created.length) {
      await manager().delete(Opportunity, created);
    }
  });

  describe("localizedOpportunityTitle", () => {
    it("uses the done translation and leaves the entity untouched", async () => {
      const opportunity = await opportunityWith(Lang.DE, {
        status: TranslationStatus.DONE,
        text: "Childcare",
      });
      const original = opportunity.title;

      expect(await localizedOpportunityTitle(opportunity)).toEqual({
        [Lang.EN]: "Childcare",
        [Lang.DE]: original,
      });
      expect(opportunity.title).toBe(original);
    });

    it("translates an English original into German", async () => {
      const opportunity = await opportunityWith(Lang.EN, {
        status: TranslationStatus.DONE,
        text: "Kinderbetreuung DE",
      });

      expect(await opportunityTitleIn(opportunity, Lang.DE)).toBe(
        "Kinderbetreuung DE",
      );
      expect(await opportunityTitleIn(opportunity, Lang.EN)).toBe(
        opportunity.title,
      );
    });

    it.each([
      ["missing", undefined],
      ["pending", { status: TranslationStatus.PENDING }],
      ["failed", { status: TranslationStatus.FAILED }],
    ])("falls back to the original when %s", async (_, translation) => {
      const opportunity = await opportunityWith(Lang.DE, translation);
      if (!translation) {
        await manager().delete(FieldTranslation, {
          opportunityId: opportunity.id,
        });
      }

      expect(await localizedOpportunityTitle(opportunity)).toEqual({
        [Lang.EN]: opportunity.title,
        [Lang.DE]: opportunity.title,
      });
    });

    it("falls back to the original when the lookup fails", async () => {
      const opportunity = await opportunityWith(Lang.DE, {
        status: TranslationStatus.DONE,
        text: "Childcare",
      });
      const find = vi
        .spyOn(manager(), "find")
        .mockRejectedValueOnce(new Error("db down"));

      const title = await opportunityTitleIn(opportunity, Lang.EN);
      find.mockRestore();

      expect(title).toBe(opportunity.title);
    });

    it("returns an empty title without a lookup", async () => {
      const find = vi.spyOn(manager(), "find");

      expect(await opportunityTitleIn(undefined, Lang.EN)).toBe("");
      find.mockRestore();

      expect(find).not.toHaveBeenCalled();
    });
  });

  describe("bilingual volunteer emails", () => {
    it("suggestion shows the English title in the English half", async () => {
      const opportunity = await opportunityWith(Lang.DE, {
        status: TranslationStatus.DONE,
        text: "Childcare",
      });

      await sendEmailSuggestion(email, ovWith(opportunity));

      const { text } = send.mock.calls[0][0];
      expect(text).toContain("may interest you: Childcare,");
      expect(text).toContain(`interessieren könnte: ${opportunity.title},`);
    });

    it("accompanying suggestion shows the English title in the English half", async () => {
      const opportunity = await opportunityWith(Lang.DE, {
        status: TranslationStatus.DONE,
        text: "Hospital visit",
      });

      await sendEmailSuggestionAccompanying(
        email,
        ovWith(opportunity, {
          accompanying: {
            address: "Main street 1",
            languageToTranslate: TranslatedIntoType.DEUTSCHE,
            postcode: { value: "10115" },
          },
          onetimer: { date: new Date("2026-03-05T13:30:00.000Z") },
          deal: { dealLanguage: [] },
        }),
      );

      const { text } = send.mock.calls[0][0];
      expect(text).toContain("Title: Hospital visit\n");
      expect(text).toContain(`Titel: ${opportunity.title}\n`);
    });
  });

  describe("German-only contact emails", () => {
    it("new-regular shows the German title of an English original", async () => {
      const opportunity = await opportunityWith(Lang.EN, {
        status: TranslationStatus.DONE,
        text: "Kinderbetreuung DE",
      });

      await sendEmailNewRegular(email, {
        id: opportunity.id,
        title: opportunity.title,
        originalLanguageId: opportunity.originalLanguageId,
        contactPerson: { name: "Con Tact", email: "contact@example.com" },
      } as unknown as Opportunity);

      const { text } = send.mock.calls[0][0];
      expect(text).toContain("“Kinderbetreuung DE”");
      expect(text).not.toContain(opportunity.title);
    });
  });
});
