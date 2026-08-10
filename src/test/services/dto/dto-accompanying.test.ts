import { TranslatedIntoType } from "need4deed-sdk";
import { describe, expect, it } from "vitest";
import District from "../../../data/entity/location/district.entity";
import Postcode from "../../../data/entity/location/postcode.entity";
import DealLanguage from "../../../data/entity/m2m/deal-language";
import Accompanying from "../../../data/entity/opportunity/accompanying.entity";
import { dtoOpportunityAccompanying } from "../../../services/dto/dto-accompanying";

const TEST_DATE = new Date("2026-06-01T10:30:00Z");

const buildAccompanying = (overrides: Partial<Accompanying> = {}) =>
  new Accompanying({
    address: "Musterstraße 1",
    name: "Jane Doe",
    phone: "030123456",
    languageToTranslate: TranslatedIntoType.DEUTSCHE,
    ...overrides,
  });

const buildDealLanguage = (languageId: number) =>
  new DealLanguage({
    language: { id: languageId } as DealLanguage["language"],
  });

describe("dtoOpportunityAccompanying", () => {
  it("returns an empty object when accompanying is falsy", () => {
    expect(dtoOpportunityAccompanying(null as unknown as Accompanying)).toEqual(
      {},
    );
  });

  it("maps base fields", () => {
    const result = dtoOpportunityAccompanying(buildAccompanying(), TEST_DATE);

    expect(result.appointmentAddress).toBe("Musterstraße 1");
    expect(result.refugeeName).toBe("Jane Doe");
    expect(result.refugeeNumber).toBe("030123456");
    expect(result.appointmentLanguage).toBe(TranslatedIntoType.DEUTSCHE);
    // TEST_DATE is 2026-06-01T10:30:00Z — 12:30 in Europe/Berlin (CEST, UTC+2 in June).
    expect(result.appointmentDate).toBe("2026-06-01");
    expect(result.appointmentTime).toBe("12:30");
    expect(result.refugeeLanguage).toEqual([]);
  });

  it("omits appointmentDate/appointmentTime when no onetimer date is given", () => {
    const result = dtoOpportunityAccompanying(buildAccompanying());

    expect(result).not.toHaveProperty("appointmentDate");
    expect(result).not.toHaveProperty("appointmentTime");
  });

  it("maps refugeeLanguage from dealLanguage, skipping falsy entries", () => {
    const result = dtoOpportunityAccompanying(buildAccompanying(), TEST_DATE, [
      buildDealLanguage(7),
      null as unknown as DealLanguage,
      buildDealLanguage(9),
    ]);

    expect(result.refugeeLanguage).toEqual([{ id: 7 }, { id: 9 }]);
  });

  it("omits appointmentPostcode when accompanying.postcode is absent", () => {
    const result = dtoOpportunityAccompanying(buildAccompanying(), TEST_DATE);

    expect(result).not.toHaveProperty("appointmentPostcode");
  });

  it("emits appointmentPostcode value when accompanying.postcode is loaded", () => {
    const postcode = new Postcode({ id: 42, value: "10115" });
    const result = dtoOpportunityAccompanying(
      buildAccompanying({ postcode }),
      TEST_DATE,
    );

    expect(result.appointmentPostcode).toBe("10115");
  });

  it("omits appointmentDistrict when district is undefined", () => {
    const result = dtoOpportunityAccompanying(buildAccompanying(), TEST_DATE);

    expect(result).not.toHaveProperty("appointmentDistrict");
  });

  it("omits appointmentDistrict when district is null", () => {
    const result = dtoOpportunityAccompanying(
      buildAccompanying(),
      TEST_DATE,
      [],
      null,
    );

    expect(result).not.toHaveProperty("appointmentDistrict");
  });

  it("emits appointmentDistrict { id } when district is provided", () => {
    const district = new District({ id: 3, title: "Mitte" });
    const result = dtoOpportunityAccompanying(
      buildAccompanying(),
      TEST_DATE,
      [],
      district,
    );

    expect(result.appointmentDistrict).toEqual({ id: 3 });
  });

  it("emits both appointmentPostcode and appointmentDistrict together", () => {
    const postcode = new Postcode({ id: 42, value: "10115" });
    const district = new District({ id: 3, title: "Mitte" });

    const result = dtoOpportunityAccompanying(
      buildAccompanying({ postcode }),
      TEST_DATE,
      [],
      district,
    );

    expect(result.appointmentPostcode).toBe("10115");
    expect(result.appointmentDistrict).toEqual({ id: 3 });
  });
});
