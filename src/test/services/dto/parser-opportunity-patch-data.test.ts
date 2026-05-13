import {
  ApiOpportunityPatch,
  LangPurpose,
  TranslatedIntoType,
} from "need4deed-sdk";
import { describe, expect, it } from "vitest";
import { BadRequestError } from "../../../config";
import { parseOpportunity } from "../../../services/dto/parser-opportunity-patch-data";

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

  it("sets accompanying.postcode relation from appointmentPostcode.id", () => {
    const result = parseOpportunity({
      accompanyingDetails: {
        appointmentPostcode: { id: 42 },
      },
    });

    expect(result.accompanying?.postcode).toEqual({ id: 42 });
  });

  it("omits accompanying.postcode when appointmentPostcode is absent", () => {
    const result = parseOpportunity({
      accompanyingDetails: {
        appointmentAddress: "Musterstraße 1",
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
});
