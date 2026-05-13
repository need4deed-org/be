import { TranslatedIntoType } from "need4deed-sdk";
import { describe, expect, it } from "vitest";
import District from "../../../data/entity/location/district.entity";
import Postcode from "../../../data/entity/location/postcode.entity";
import ProfileLanguage from "../../../data/entity/m2m/profile-language";
import Accompanying from "../../../data/entity/opportunity/accompanying.entity";
import { dtoOpportunityAccompanying } from "../../../services/dto/dto-accompanying";

const buildAccompanying = (overrides: Partial<Accompanying> = {}) =>
  new Accompanying({
    address: "Musterstraße 1",
    name: "Jane Doe",
    phone: "030123456",
    date: new Date("2026-06-01T10:30:00Z"),
    languageToTranslate: TranslatedIntoType.DEUTSCHE,
    ...overrides,
  });

const buildProfileLanguage = (languageId: number) =>
  new ProfileLanguage({
    language: { id: languageId } as ProfileLanguage["language"],
  });

describe("dtoOpportunityAccompanying", () => {
  it("returns an empty object when accompanying is falsy", () => {
    expect(dtoOpportunityAccompanying(null as unknown as Accompanying)).toEqual(
      {},
    );
  });

  it("maps base fields", () => {
    const result = dtoOpportunityAccompanying(buildAccompanying());

    expect(result.appointmentAddress).toBe("Musterstraße 1");
    expect(result.refugeeName).toBe("Jane Doe");
    expect(result.refugeeNumber).toBe("030123456");
    expect(result.appointmentLanguage).toBe(TranslatedIntoType.DEUTSCHE);
    expect(result.appointmentDate).toBe(
      new Date("2026-06-01T10:30:00Z").toDateString(),
    );
    expect(result.appointmentTime).toBe("10:30");
    expect(result.refugeeLanguage).toEqual([]);
  });

  it("maps refugeeLanguage from profileLanguage, skipping falsy entries", () => {
    const result = dtoOpportunityAccompanying(buildAccompanying(), [
      buildProfileLanguage(7),
      null as unknown as ProfileLanguage,
      buildProfileLanguage(9),
    ]);

    expect(result.refugeeLanguage).toEqual([{ id: 7 }, { id: 9 }]);
  });

  it("omits appointmentPostcode when accompanying.postcode is absent", () => {
    const result = dtoOpportunityAccompanying(buildAccompanying());

    expect(result).not.toHaveProperty("appointmentPostcode");
  });

  it("emits appointmentPostcode { id } when accompanying.postcode is loaded", () => {
    const postcode = new Postcode({ id: 42, value: "10115" });
    const result = dtoOpportunityAccompanying(buildAccompanying({ postcode }));

    expect(result.appointmentPostcode).toEqual({ id: 42 });
  });

  it("omits appointmentDistrict when district is undefined", () => {
    const result = dtoOpportunityAccompanying(buildAccompanying());

    expect(result).not.toHaveProperty("appointmentDistrict");
  });

  it("omits appointmentDistrict when district is null", () => {
    const result = dtoOpportunityAccompanying(buildAccompanying(), [], null);

    expect(result).not.toHaveProperty("appointmentDistrict");
  });

  it("emits appointmentDistrict { id } when district is provided", () => {
    const district = new District({ id: 3, title: "Mitte" });
    const result = dtoOpportunityAccompanying(
      buildAccompanying(),
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
      [],
      district,
    );

    expect(result.appointmentPostcode).toEqual({ id: 42 });
    expect(result.appointmentDistrict).toEqual({ id: 3 });
  });
});
