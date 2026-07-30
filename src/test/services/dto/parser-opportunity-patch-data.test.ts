import {
  ApiOpportunityPatch,
  LangPurpose,
  TranslatedIntoType,
} from "need4deed-sdk";
import { Repository } from "typeorm";
import { describe, expect, it, vi } from "vitest";
import { BadRequestError } from "../../../config";
import Language from "../../../data/entity/profile/language.entity";
import {
  assertValidMainCommunicationLanguages,
  parseOpportunity,
} from "../../../services/dto/parser-opportunity-patch-data";

describe("parseOpportunity", () => {
  it("throws BadRequestError when body is falsy", () => {
    expect(() =>
      parseOpportunity(undefined as unknown as ApiOpportunityPatch),
    ).toThrow(BadRequestError);
  });

  it("returns null for accompanying when no accompanyingDetails sent", () => {
    const result = parseOpportunity({});
    expect(result.accompanying).toBeNull();
  });

  it("maps base accompanying fields", () => {
    const result = parseOpportunity({
      accompanyingDetails: {
        appointmentAddress: "Musterstraße 1",
        refugeeName: "Jane Doe",
        refugeeNumber: "030123456",
        appointmentLanguage: TranslatedIntoType.DEUTSCHE,
      },
    });

    expect(result.accompanying).toMatchObject({
      address: "Musterstraße 1",
      name: "Jane Doe",
      phone: "030123456",
      languageToTranslate: TranslatedIntoType.DEUTSCHE,
    });
  });

  it("composes accompanying.date from appointmentDate + appointmentTime", () => {
    const result = parseOpportunity({
      accompanyingDetails: {
        appointmentDate: "2026-06-01",
        appointmentTime: "10:30",
      },
    });

    expect(result.accompanying?.date).toBeInstanceOf(Date);
  });

  it("does not set accompanying.postcode (resolved in route handler instead)", () => {
    const result = parseOpportunity({
      accompanyingDetails: {
        appointmentPostcode: "10115",
      },
    });

    expect(result.accompanying).not.toHaveProperty("postcode");
  });

  it("returns null for languages when no source arrays provided", () => {
    const result = parseOpportunity({});
    expect(result.languages).toBeNull();
  });

  it("maps refugeeLanguage to languages with TRANSLATION purpose", () => {
    const result = parseOpportunity({
      accompanyingDetails: {
        refugeeLanguage: [{ id: 5 }, { id: 6 }],
      },
    });

    expect(result.languages).toEqual([
      { id: 5, purpose: LangPurpose.TRANSLATION },
      { id: 6, purpose: LangPurpose.TRANSLATION },
    ]);
  });

  it("deduplicates refugeeLanguage against languagesResidents (same purpose, same id)", () => {
    const result = parseOpportunity({
      languagesResidents: [{ id: 5, title: "German" }],
      accompanyingDetails: {
        refugeeLanguage: [{ id: 5 }, { id: 7 }],
      },
    });

    expect(result.languages).toEqual([
      { id: 5, purpose: LangPurpose.TRANSLATION },
      { id: 7, purpose: LangPurpose.TRANSLATION },
    ]);
  });

  it("keeps same id under different purposes (GENERAL + TRANSLATION)", () => {
    const result = parseOpportunity({
      languagesMain: [{ id: 5, title: "German" }],
      accompanyingDetails: {
        refugeeLanguage: [{ id: 5 }],
      },
    });

    expect(result.languages).toEqual([
      { id: 5, purpose: LangPurpose.GENERAL },
      { id: 5, purpose: LangPurpose.TRANSLATION },
    ]);
  });

  it("skips in-place agent edit when agent.id is sent (relink intent)", () => {
    const result = parseOpportunity({
      agent: { id: 42 },
    });

    expect(result.agent).toBeNull();
  });

  it("keeps existing in-place agent edit when no agent.id is sent", () => {
    const result = parseOpportunity({
      agent: { name: "RAC Tegel" },
    });

    expect(result.agent).toMatchObject({ title: "RAC Tegel" });
  });

  it("skips in-place agent edit when agent.id is sent even with other fields", () => {
    const result = parseOpportunity({
      agent: {
        id: 7,
        name: "ignored",
        address: "ignored",
        district: "ignored",
      },
    });

    expect(result.agent).toBeNull();
  });
});

describe("assertValidMainCommunicationLanguages", () => {
  const findBy = vi.fn();
  const languageRepository = { findBy } as unknown as Repository<Language>;

  function mockLanguages(rows: { id: number; isoCode: string }[]) {
    findBy.mockResolvedValueOnce(rows);
  }

  it("resolves without querying when languagesMain is undefined", async () => {
    await expect(
      assertValidMainCommunicationLanguages(undefined, languageRepository),
    ).resolves.toBeUndefined();
    expect(findBy).not.toHaveBeenCalled();
  });

  it("resolves without querying when languagesMain is empty", async () => {
    await expect(
      assertValidMainCommunicationLanguages([], languageRepository),
    ).resolves.toBeUndefined();
    expect(findBy).not.toHaveBeenCalled();
  });

  it("resolves when the selection is German only", async () => {
    mockLanguages([{ id: 1, isoCode: "de" }]);
    await expect(
      assertValidMainCommunicationLanguages([{ id: 1 }], languageRepository),
    ).resolves.toBeUndefined();
  });

  it("resolves when the selection is German and English", async () => {
    mockLanguages([
      { id: 1, isoCode: "de" },
      { id: 2, isoCode: "en" },
    ]);
    await expect(
      assertValidMainCommunicationLanguages(
        [{ id: 1 }, { id: 2 }],
        languageRepository,
      ),
    ).resolves.toBeUndefined();
  });

  it("resolves when the selection is English only", async () => {
    mockLanguages([{ id: 2, isoCode: "en" }]);
    await expect(
      assertValidMainCommunicationLanguages([{ id: 2 }], languageRepository),
    ).resolves.toBeUndefined();
  });

  it("rejects a language other than German/English", async () => {
    mockLanguages([{ id: 3, isoCode: "fr" }]);
    await expect(
      assertValidMainCommunicationLanguages([{ id: 3 }], languageRepository),
    ).rejects.toThrow(BadRequestError);
  });

  it("rejects when one of the ids doesn't resolve to any language row", async () => {
    // Only 1 of the 2 requested ids came back — the other is stale/bogus and
    // must not be silently dropped from the check.
    mockLanguages([{ id: 1, isoCode: "de" }]);
    await expect(
      assertValidMainCommunicationLanguages(
        [{ id: 1 }, { id: 999999 }],
        languageRepository,
      ),
    ).rejects.toThrow(BadRequestError);
  });

  it("dedupes repeated/string-vs-number ids before checking resolution", async () => {
    // If ids weren't deduped first, findBy returning a single row for a
    // 3-times-repeated id would look like 2 unresolved ids and wrongly reject.
    mockLanguages([{ id: 1, isoCode: "de" }]);
    await expect(
      assertValidMainCommunicationLanguages(
        [{ id: 1 }, { id: 1 }, { id: "1" }],
        languageRepository,
      ),
    ).resolves.toBeUndefined();
  });
});
